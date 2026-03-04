import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
import {
    createGroup,
    getGroupMetadata,
    getGroupInviteCode,
    removeGroupMember,
} from '../services/whatsapp.service';

const router = Router();
router.use(authenticate);

// Helper: validate session ownership
const validateSessionOwnership = async (req: AuthRequest, sessionId: string): Promise<boolean> => {
    const session = await prisma.whatsappSession.findFirst({
        where: { id: sessionId, companyId: req.user!.companyId, userId: req.user!.id },
    });
    return !!session;
};

// POST /api/groups — Create a WhatsApp group
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { sessionId, name, participants } = req.body;

        if (!sessionId || !name || !Array.isArray(participants) || participants.length === 0) {
            res.status(400).json({ error: 'sessionId, name y participants[] son requeridos' });
            return;
        }

        // Validate session belongs to this user/company
        if (!(await validateSessionOwnership(req, sessionId))) {
            res.status(404).json({ error: 'Sesión no encontrada o no tienes permiso' });
            return;
        }

        // Create group in WhatsApp
        const result = await createGroup(sessionId, name, participants);
        const groupJid = result.id;

        // Get invite code
        let inviteCode: string | null = null;
        try {
            inviteCode = await getGroupInviteCode(sessionId, groupJid);
        } catch { /* not critical */ }

        // Save group to DB
        const group = await prisma.whatsappGroup.create({
            data: {
                companyId: req.user!.companyId,
                sessionId,
                groupJid,
                name,
                inviteCode,
            },
        });

        // Save initial members
        const now = new Date();
        if (result.participants && Array.isArray(result.participants)) {
            for (const p of result.participants) {
                const phone = (p.id || p.jid || '').replace('@s.whatsapp.net', '');
                if (phone) {
                    await prisma.whatsappGroupMember.upsert({
                        where: { groupId_phone: { groupId: group.id, phone } },
                        update: {},
                        create: {
                            groupId: group.id,
                            phone,
                            joinedAt: now,
                            isAdmin: p.admin === 'admin' || p.admin === 'superadmin',
                        },
                    });
                }
            }
        }

        res.status(201).json({ group });
    } catch (err: any) {
        console.error('Error creating group:', err);
        res.status(500).json({ error: err.message || 'Error al crear grupo' });
    }
});

// GET /api/groups — List all groups for the company (filtered by user session)
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const groups = await prisma.whatsappGroup.findMany({
            where: {
                companyId: req.user!.companyId,
                whatsappSession: {
                    userId: req.user!.id
                }
            },
            include: { _count: { select: { members: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ groups });
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener grupos' });
    }
});

// GET /api/groups/:id — Get group detail with members (live from WhatsApp + DB)
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const group = await prisma.whatsappGroup.findFirst({
            where: {
                id: req.params.id,
                companyId: req.user!.companyId,
                whatsappSession: { userId: req.user!.id }
            },
            include: { members: { orderBy: { joinedAt: 'asc' } } },
        });
        if (!group) {
            res.status(404).json({ error: 'Grupo no encontrado' });
            return;
        }

        // Try to sync live metadata from WhatsApp
        try {
            const metadata = await getGroupMetadata(group.sessionId, group.groupJid);
            const now = new Date();

            for (const p of metadata.participants || []) {
                const phone = (p.id || '').replace('@s.whatsapp.net', '');
                if (!phone) continue;
                await prisma.whatsappGroupMember.upsert({
                    where: { groupId_phone: { groupId: group.id, phone } },
                    update: { isAdmin: p.admin === 'admin' || p.admin === 'superadmin' },
                    create: {
                        groupId: group.id,
                        phone,
                        joinedAt: now,
                        isAdmin: p.admin === 'admin' || p.admin === 'superadmin',
                    },
                });
            }
        } catch { /* ignore if session offline */ }

        // Return fresh data from DB
        const updated = await prisma.whatsappGroup.findFirst({
            where: { id: group.id },
            include: { members: { orderBy: { joinedAt: 'asc' } } },
        });
        res.json({ group: updated });
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener grupo' });
    }
});

// GET /api/groups/:id/invite — Get invite link
router.get('/:id/invite', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const group = await prisma.whatsappGroup.findFirst({
            where: {
                id: req.params.id,
                companyId: req.user!.companyId,
                whatsappSession: { userId: req.user!.id }
            },
        });
        if (!group) {
            res.status(404).json({ error: 'Grupo no encontrado' });
            return;
        }

        const code = await getGroupInviteCode(group.sessionId, group.groupJid);
        const link = `https://chat.whatsapp.com/${code}`;

        // Update stored invite code
        await prisma.whatsappGroup.update({
            where: { id: group.id },
            data: { inviteCode: code },
        });

        res.json({ code, link });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Error al obtener link de invitación' });
    }
});

// DELETE /api/groups/:id/members/:phone — Remove a member from the group
router.delete('/:id/members/:phone', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const group = await prisma.whatsappGroup.findFirst({
            where: {
                id: req.params.id,
                companyId: req.user!.companyId,
                whatsappSession: { userId: req.user!.id }
            },
        });
        if (!group) {
            res.status(404).json({ error: 'Grupo no encontrado' });
            return;
        }

        const phone = decodeURIComponent(req.params.phone);

        await removeGroupMember(group.sessionId, group.groupJid, phone);

        // Remove from DB
        await prisma.whatsappGroupMember.deleteMany({
            where: { groupId: group.id, phone },
        });

        res.json({ message: 'Miembro eliminado del grupo' });
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Error al eliminar miembro' });
    }
});

import QRCode from 'qrcode';

// GET /api/groups/:id/qr — Get invite QR code
router.get('/:id/qr', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const group = await prisma.whatsappGroup.findFirst({
            where: {
                id: req.params.id,
                companyId: req.user!.companyId,
                whatsappSession: { userId: req.user!.id }
            },
        });
        if (!group) {
            res.status(404).json({ error: 'Grupo no encontrado' });
            return;
        }

        let code = group.inviteCode;
        if (!code) {
            code = await getGroupInviteCode(group.sessionId, group.groupJid);
            await prisma.whatsappGroup.update({
                where: { id: group.id },
                data: { inviteCode: code }
            });
        }

        const link = `https://chat.whatsapp.com/${code}`;
        const qrBuffer = await QRCode.toBuffer(link, { width: 400 });

        res.set('Content-Type', 'image/png');
        res.send(qrBuffer);
    } catch (err: any) {
        res.status(500).json({ error: err.message || 'Error al generar QR' });
    }
});

export default router;
