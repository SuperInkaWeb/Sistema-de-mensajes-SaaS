import { proto } from '@whiskeysockets/baileys';
import prisma from '../lib/prisma';

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

    if (msg.templateButtonReplyMessage) return { content: msg.templateButtonReplyMessage.selectedDisplayText || '', messageType: 'text' };
    if (msg.buttonsResponseMessage) return { content: msg.buttonsResponseMessage.selectedDisplayText || '', messageType: 'text' };

    return { content: '', messageType: 'text' };
};

export const saveHistoryMessages = async (
    messages: proto.IWebMessageInfo[],
    sessionId: string,
    companyId: string
): Promise<void> => {
    for (const msg of messages) {
        if (!msg.message || !msg.key.remoteJid) continue;

        const remoteJid = msg.key.remoteJid;
        const messageContent = msg.message;

        const { content, messageType } = getMessageContent(messageContent);

        const timestamp = new Date(Number(msg.messageTimestamp) * 1000);

        // Upsert chat to ensure it exists and has latest preview
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
            },
            create: {
                whatsappSessionId: sessionId,
                remoteJid,
                contactName: remoteJid.includes('@g.us') ? 'Grupo' : remoteJid.split('@')[0],
                lastMessagePreview: content || `[${messageType}]`,
                lastMessageAt: timestamp,
            },
        });

        // Skip if message already exists
        if (msg.key.id) {
            const existing = await prisma.message.findFirst({
                where: { waMessageId: msg.key.id },
            });
            if (existing) continue;
        }

        await prisma.message.create({
            data: {
                chatId: chat.id,
                senderId: msg.key.fromMe ? 'me' : remoteJid,
                content,
                messageType,
                timestamp, // Use original timestamp, not current time
                waMessageId: msg.key.id,
                fromMe: msg.key.fromMe || false,
            },
        });
    }
};

export const saveMessage = async (
    chatId: string,
    data: {
        senderId?: string;
        content?: string;
        mediaUrl?: string;
        messageType: string;
        timestamp: Date;
        waMessageId?: string;
        fromMe: boolean;
    }
) => {
    return prisma.message.create({ data: { chatId, ...data } });
};
