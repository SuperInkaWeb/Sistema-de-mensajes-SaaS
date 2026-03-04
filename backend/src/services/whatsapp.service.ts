import makeWASocket, {
    DisconnectReason,
    fetchLatestBaileysVersion,
    useMultiFileAuthState,
    WASocket,
    proto,
    downloadMediaMessage,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { saveHistoryMessages } from './message.service';

// Socket.io instance — injected after server starts to avoid circular imports
let _io: Server | null = null;
export const setSocketIO = (io: Server): void => { _io = io; };
export const getIO = (): Server => {
    if (!_io) throw new Error('Socket.io not initialized');
    return _io;
};

// Map to hold active WhatsApp socket connections
export const activeSessions: Map<string, WASocket> = new Map();

const getSessionDir = (sessionId: string): string => {
    const dir = path.join(process.cwd(), 'sessions', sessionId);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
};

export const createWhatsAppSession = async (
    sessionId: string,
    companyId: string,
    userId?: string
): Promise<void> => {

    const sessionDir = getSessionDir(sessionId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    // Ensure we have the userId if it's a restart
    let effectiveUserId: string | undefined = userId;
    if (!effectiveUserId) {
        const s = await prisma.whatsappSession.findUnique({ where: { id: sessionId }, select: { userId: true } });
        effectiveUserId = s?.userId || undefined;
    }

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ['WhatsApp SaaS', 'Chrome', '1.0.0'],
        syncFullHistory: false, // Don't sync full history to avoid bans
        getMessage: async (key) => {
            return { conversation: '' };
        },
    });

    activeSessions.set(sessionId, sock);

    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log(`📱 QR generated for session ${sessionId}`);
            // Update DB with QR
            await prisma.whatsappSession.update({
                where: { id: sessionId },
                data: {
                    sessionStatus: 'qr_ready',
                    qrCodeString: qr,
                },
            });

            // Emit QR to frontend via Socket.io
            getIO().to(`company:${companyId}`).emit('qr_code', {
                sessionId,
                qr,
            });
        }

        if (connection === 'close') {
            const shouldReconnect =
                (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

            console.log(`🔴 Session ${sessionId} disconnected. Reconnect: ${shouldReconnect}`);

            await prisma.whatsappSession.update({
                where: { id: sessionId },
                data: { sessionStatus: 'disconnected' },
            });

            getIO().to(`company:${companyId}`).emit('session_status', {
                sessionId,
                status: 'disconnected',
            });

            if (shouldReconnect) {
                // Wait 3 seconds before reconnecting
                setTimeout(() => createWhatsAppSession(sessionId, companyId), 3000);
            } else {
                // Logged out - clean up session files
                activeSessions.delete(sessionId);
                fs.rmSync(sessionDir, { recursive: true, force: true });
            }
        }

        if (connection === 'open') {
            console.log(`✅ Session ${sessionId} connected!`);
            const phoneNumber = sock.user?.id?.split(':')[0] || '';

            await prisma.whatsappSession.update({
                where: { id: sessionId },
                data: {
                    sessionStatus: 'connected',
                    phoneNumber,
                    qrCodeString: null,
                },
            });

            getIO().to(`company:${companyId}`).emit('session_status', {
                sessionId,
                status: 'connected',
                phoneNumber,
            });
        }
    });

    // Save credentials when updated
    sock.ev.on('creds.update', saveCreds);

    // Handle incoming and outgoing messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        for (const msg of messages) {
            if (!msg.message) continue;

            try {
                await processMessageUpsert(msg, sessionId, companyId, sock, effectiveUserId);
            } catch (error) {
                console.error('Error processing message upsert:', error);
            }
        }
    });

    // Handle history sync
    sock.ev.on('messaging-history.set', async ({ messages, chats, contacts, isLatest }) => {
        console.log(`📜 History sync: ${messages.length} messages, ${chats.length} chats, ${contacts?.length || 0} contacts (isLatest: ${isLatest})`);

        try {
            // Sync all contacts from history first
            if (contacts && contacts.length > 0) {
                await syncContacts(contacts, companyId, effectiveUserId);
            }

            // Process history messages
            await saveHistoryMessages(messages, sessionId, companyId);

            getIO().to(`company:${companyId}`).emit('history_synced', {
                sessionId,
                messageCount: messages.length,
                contactCount: contacts?.length || 0
            });
        } catch (error) {
            console.error('Error saving history:', error);
        }
    });

    // Handle real-time contact updates
    sock.ev.on('contacts.upsert', async (newContacts) => {
        await syncContacts(newContacts, companyId, effectiveUserId);
    });

    sock.ev.on('contacts.update', async (updatedContacts) => {
        // Baileys update events might contain partial data, syncContacts handles upsert
        await syncContacts(updatedContacts, companyId, effectiveUserId);
    });
};

const syncContacts = async (contacts: any[], companyId: string, agentUserId?: string) => {
    console.log(`🔄 Syncing ${contacts.length} contacts for company ${companyId}...`);

    for (const contact of contacts) {
        const remoteJid = contact.id;
        if (!remoteJid || remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') continue;

        const phone = remoteJid.replace(/\D/g, '');
        if (!phone) continue;

        const name = contact.verifiedName || contact.pushName || contact.name || phone;

        try {
            // Use upsert to avoid duplicates and update names if they changed
            await (prisma as any).contact.upsert({
                where: {
                    companyId_phone: {
                        companyId,
                        phone,
                    },
                },
                update: {
                    name,
                    // Don't overwrite agentUserId if it's already set to someone else
                },
                create: {
                    companyId,
                    phone,
                    name,
                    agentUserId: agentUserId || null,
                },
            });
        } catch (error) {
            // Silently handle unique constraint races if any, but log other errors
            if (!(error as any).code?.includes('P2002')) {
                console.error(`Error syncing contact ${phone}:`, error);
            }
        }
    }
};

const getMessageContent = (message: any): { content: string; messageType: string } => {
    if (!message) return { content: '', messageType: 'text' };

    let msg = message;
    if (msg.ephemeralMessage) msg = msg.ephemeralMessage.message;
    if (msg.viewOnceMessage) msg = msg.viewOnceMessage.message;
    if (msg.viewOnceMessageV2) msg = msg.viewOnceMessageV2.message;

    if (!msg) return { content: '', messageType: 'text' };

    if (msg.conversation) return { content: msg.conversation, messageType: 'text' };
    if (msg.extendedTextMessage) return { content: msg.extendedTextMessage.text || '', messageType: 'text' };
    if (msg.imageMessage) return { content: msg.imageMessage.caption || '', messageType: 'image' };
    if (msg.videoMessage) return { content: msg.videoMessage.caption || '', messageType: 'video' };
    if (msg.audioMessage) return { content: '', messageType: 'audio' };
    if (msg.documentMessage) return { content: msg.documentMessage.fileName || '', messageType: 'document' };
    if (msg.stickerMessage) return { content: '', messageType: 'sticker' };

    // Fallback for button replies etc.
    if (msg.templateButtonReplyMessage) return { content: msg.templateButtonReplyMessage.selectedDisplayText || '', messageType: 'text' };
    if (msg.buttonsResponseMessage) return { content: msg.buttonsResponseMessage.selectedDisplayText || '', messageType: 'text' };

    return { content: '', messageType: 'text' };
};

const processMessageUpsert = async (
    msg: proto.IWebMessageInfo,
    sessionId: string,
    companyId: string,
    sock: WASocket,
    userId?: string
): Promise<void> => {
    const remoteJid = msg.key.remoteJid!;
    const messageContent = msg.message;

    if (!messageContent || remoteJid === 'status@broadcast') return;

    const { content, messageType } = getMessageContent(messageContent);
    let mediaUrl: string | null = null;

    // Try to get contact name from DB
    let contactName = msg.pushName || remoteJid.split('@')[0];
    const existingContact = await (prisma as any).contact.findFirst({
        where: {
            companyId,
            phone: remoteJid.replace(/\D/g, ''),
            OR: [
                { agentUserId: userId || null },
                { agentUserId: null }
            ]
        }
    });

    // If contact doesn't exist, create it linked to the agent
    if (!existingContact && !msg.key.fromMe) {
        try {
            await (prisma as any).contact.create({
                data: {
                    companyId,
                    phone: remoteJid.replace(/\D/g, ''),
                    name: contactName,
                    agentUserId: userId || null,
                }
            });
        } catch (e) {
            console.error('Error creating auto-contact:', e);
        }
    }
    if (existingContact) {
        contactName = existingContact.name;
    }

    const timestamp = new Date(Number(msg.messageTimestamp) * 1000);

    const chat = await prisma.chat.upsert({
        where: {
            whatsappSessionId_remoteJid: {
                whatsappSessionId: sessionId,
                remoteJid,
            },
        },
        update: {
            lastMessagePreview: content || `[${messageType}]`,
            lastMessageAt: timestamp,
            unreadCount: { increment: msg.key.fromMe ? 0 : 1 },
            contactName,
        },
        create: {
            whatsappSessionId: sessionId,
            remoteJid,
            contactName,
            lastMessagePreview: content || `[${messageType}]`,
            lastMessageAt: timestamp,
            unreadCount: msg.key.fromMe ? 0 : 1,
        },
    });

    // Check if message already exists
    const existingMsg = await prisma.message.findFirst({
        where: { waMessageId: msg.key.id }
    });

    if (existingMsg) return;

    const savedMessage = await prisma.message.create({
        data: {
            chatId: chat.id,
            senderId: msg.key.fromMe ? 'me' : remoteJid,
            content,
            mediaUrl,
            messageType,
            timestamp,
            waMessageId: msg.key.id,
            fromMe: msg.key.fromMe || false,
        },
    });

    getIO().to(`company:${companyId}`).emit('new_message', {
        message: savedMessage,
        chat,
    });
};

export const sendTextMessage = async (
    sessionId: string,
    remoteJid: string,
    text: string
): Promise<void> => {
    const sock = activeSessions.get(sessionId);
    if (!sock) throw new Error('Session not connected');

    await sock.sendMessage(remoteJid, { text });
};

export const sendMediaMessage = async (
    sessionId: string,
    remoteJid: string,
    mediaPath: string,
    type: 'image' | 'video' | 'audio' | 'document',
    caption?: string
): Promise<void> => {
    const sock = activeSessions.get(sessionId);
    if (!sock) throw new Error('Session not connected');

    const messageContent: any = {};
    const media = { url: mediaPath };

    if (type === 'image') messageContent.image = media;
    else if (type === 'video') messageContent.video = media;
    else if (type === 'audio') messageContent.audio = media;
    else if (type === 'document') messageContent.document = media;

    if (caption) messageContent.caption = caption;

    await sock.sendMessage(remoteJid, messageContent);
};

export const disconnectSession = async (sessionId: string): Promise<void> => {
    const sock = activeSessions.get(sessionId);
    if (sock) {
        await sock.logout();
        activeSessions.delete(sessionId);
    }
};

export const getSessionStatus = (sessionId: string): boolean => {
    return activeSessions.has(sessionId);
};

export const createGroup = async (
    sessionId: string,
    name: string,
    participants: string[]
): Promise<{ id: string; participants: any[] }> => {
    const sock = activeSessions.get(sessionId);
    if (!sock) throw new Error('Session not connected');

    // Format numbers to WhatsApp JID format
    const jids = participants.map((p) => {
        const clean = p.replace(/\D/g, '');
        return `${clean}@s.whatsapp.net`;
    });

    const result = await sock.groupCreate(name, jids);
    return result;
};

export const getGroupMetadata = async (
    sessionId: string,
    groupJid: string
): Promise<any> => {
    const sock = activeSessions.get(sessionId);
    if (!sock) throw new Error('Session not connected');

    const metadata = await sock.groupMetadata(groupJid);
    return metadata;
};

export const getGroupInviteCode = async (
    sessionId: string,
    groupJid: string
): Promise<string> => {
    const sock = activeSessions.get(sessionId);
    if (!sock) throw new Error('Session not connected');

    const code = await sock.groupInviteCode(groupJid);
    if (!code) throw new Error('Could not retrieve invite code');
    return code;
};

export const removeGroupMember = async (
    sessionId: string,
    groupJid: string,
    phone: string
): Promise<void> => {
    const sock = activeSessions.get(sessionId);
    if (!sock) throw new Error('Session not connected');

    const clean = phone.replace(/\D/g, '');
    const jid = `${clean}@s.whatsapp.net`;

    await sock.groupParticipantsUpdate(groupJid, [jid], 'remove');
};

export const addGroupMember = async (
    sessionId: string,
    groupJid: string,
    phone: string
): Promise<void> => {
    const sock = activeSessions.get(sessionId);
    if (!sock) throw new Error('Session not connected');

    const clean = phone.replace(/\D/g, '');
    const jid = `${clean}@s.whatsapp.net`;

    await sock.groupParticipantsUpdate(groupJid, [jid], 'add');
};

// Restore all sessions on server startup
export const restoreAllSessions = async (): Promise<void> => {
    const sessions = await prisma.whatsappSession.findMany({
        where: { sessionStatus: 'connected' },
    });

    console.log(`🔄 Restoring ${sessions.length} WhatsApp sessions...`);

    for (const session of sessions) {
        const sessionDir = path.join(process.cwd(), 'sessions', session.id);
        if (fs.existsSync(sessionDir)) {
            await createWhatsAppSession(session.id, session.companyId, session.userId || undefined);
        }
    }

};
