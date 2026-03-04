import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
import { sendTextMessage, sendMediaMessage } from '../services/whatsapp.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for media uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

router.use(authenticate);

// GET /api/messages/:chatId - Get message history for a chat
router.get('/:chatId', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { chatId } = req.params;

        // Verify chat belongs to company and user (isolation)
        const chat = await prisma.chat.findFirst({
            where: {
                id: chatId,
                whatsappSession: {
                    companyId: req.user!.companyId,
                    userId: req.user!.id,
                },
            },
        });

        if (!chat) {
            res.status(404).json({ error: 'Chat no encontrado' });
            return;
        }

        const messages = await prisma.message.findMany({
            where: { chatId },
            orderBy: { timestamp: 'asc' },
        });

        res.json({ messages });
    } catch (error) {
        console.error('Fetch messages error:', error);
        res.status(500).json({ error: 'Error al obtener mensajes' });
    }
});

// POST /api/messages/send - Send a text message
router.post('/send', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { chatId, text } = req.body;

        if (!chatId || !text) {
            res.status(400).json({ error: 'chatId y texto son requeridos' });
            return;
        }

        // Verify chat belongs to company and user
        const chat = await prisma.chat.findFirst({
            where: {
                id: chatId,
                whatsappSession: {
                    companyId: req.user!.companyId,
                    userId: req.user!.id,
                },
            },
            include: { whatsappSession: true },
        });

        if (!chat) {
            res.status(404).json({ error: 'Chat no encontrado' });
            return;
        }

        // Send via Baileys
        await sendTextMessage(chat.whatsappSessionId, chat.remoteJid, text);

        res.json({ success: true });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Error al enviar mensaje' });
    }
});

// POST /api/messages/send-media - Send a media message
router.post('/send-media', upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { chatId, caption } = req.body;
        const file = req.file;

        if (!chatId || !file) {
            res.status(400).json({ error: 'chatId and file are required' });
            return;
        }

        // Verify chat belongs to company
        const chat = await prisma.chat.findFirst({
            where: {
                id: chatId,
                whatsappSession: { companyId: req.user!.companyId },
            },
            include: { whatsappSession: true },
        });

        if (!chat) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }

        const mediaPath = path.join(process.cwd(), 'uploads', file.filename);
        const mediaUrl = `/uploads/${file.filename}`;

        // Determine type based on mimetype
        let messageType = 'document';
        if (file.mimetype.startsWith('image/')) messageType = 'image';
        else if (file.mimetype.startsWith('video/')) messageType = 'video';
        else if (file.mimetype.startsWith('audio/')) messageType = 'audio';

        // Send via Baileys
        await sendMediaMessage(
            chat.whatsappSessionId,
            chat.remoteJid,
            mediaPath,
            messageType as any,
            caption
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Send media error:', error);
        res.status(500).json({ error: 'Failed to send media message' });
    }
});

export default router;
