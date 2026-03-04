import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();

router.use(authenticate);

// GET /api/chats - Get all chats for the company (unified inbox)
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const where: any = {
            whatsappSession: {
                companyId: req.user!.companyId,
            },
        };

        // Todos los usuarios ven sus propios chats (filtrado por su userId asignado)
        where.whatsappSession.userId = req.user!.id;


        const chats = await prisma.chat.findMany({
            where,
            include: {
                whatsappSession: {
                    select: {
                        id: true,
                        sessionName: true,
                        phoneNumber: true,
                        sessionStatus: true,
                    },
                },
            },
            orderBy: { lastMessageAt: 'desc' },
        });

        res.json({ chats });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

// GET /api/chats/:id - Get a specific chat
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const where: any = {
            id: req.params.id,
            whatsappSession: { companyId: req.user!.companyId },
        };

        // Todos los usuarios ven sus propios chats
        where.whatsappSession.userId = req.user!.id;

        const chat = await prisma.chat.findFirst({
            where,
            include: {
                whatsappSession: {
                    select: { id: true, sessionName: true, phoneNumber: true },
                },
            },
        });

        if (!chat) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }

        // Reset unread count
        await prisma.chat.update({
            where: { id: chat.id },
            data: { unreadCount: 0 },
        });

        res.json({ chat });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch chat' });
    }
});

export default router;
