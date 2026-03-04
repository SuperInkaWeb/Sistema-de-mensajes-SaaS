import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authenticate);

// Middleware: solo admins pueden gestionar agentes
function adminOnly(req: AuthRequest, res: Response, next: () => void) {
    if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Solo administradores pueden gestionar agentes' });
        return;
    }
    next();
}

// Campos públicos a devolver (sin passwordHash)
function publicAgent(u: any) {
    return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        whatsappPhone: u.whatsappPhone ?? null,
        isActive: u.isActive ?? true,
        createdAt: u.createdAt,
    };
}

// GET /api/agents - Listar agentes de la empresa
router.get('/', adminOnly as any, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const agents = await (prisma.user as any).findMany({
            where: {
                companyId: req.user!.companyId,
                role: 'agent',
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ agents: agents.map(publicAgent) });
    } catch {
        res.status(500).json({ error: 'Error al obtener agentes' });
    }
});

// POST /api/agents - Crear subcuenta agente
router.post('/', adminOnly as any, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, email, password, whatsappPhone } = req.body;

        if (!name || !email || !password) {
            res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
            return;
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            res.status(409).json({ error: 'Ya existe un usuario con ese email' });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const agent = await (prisma.user as any).create({
            data: {
                companyId: req.user!.companyId,
                name,
                email,
                passwordHash,
                role: 'agent',
                whatsappPhone: whatsappPhone || null,
                parentId: req.user!.id,
            },
        });
        res.status(201).json({ agent: publicAgent(agent) });
    } catch (err) {
        console.error('[POST /agents] Error al crear agente:', err);
        res.status(500).json({ error: 'Error al crear agente' });
    }
});

// PATCH /api/agents/:id - Editar agente
router.patch('/:id', adminOnly as any, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, whatsappPhone, isActive, password } = req.body;

        const agent = await prisma.user.findFirst({
            where: { id: req.params.id, companyId: req.user!.companyId, role: 'agent' },
        });
        if (!agent) {
            res.status(404).json({ error: 'Agente no encontrado' });
            return;
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (whatsappPhone !== undefined) updateData.whatsappPhone = whatsappPhone;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (password) updateData.passwordHash = await bcrypt.hash(password, 12);

        const updated = await (prisma.user as any).update({
            where: { id: agent.id },
            data: updateData,
        });
        res.json({ agent: publicAgent(updated) });
    } catch {
        res.status(500).json({ error: 'Error al actualizar agente' });
    }
});

// DELETE /api/agents/:id - Eliminar agente
router.delete('/:id', adminOnly as any, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const agent = await prisma.user.findFirst({
            where: { id: req.params.id, companyId: req.user!.companyId, role: 'agent' },
        });
        if (!agent) {
            res.status(404).json({ error: 'Agente no encontrado' });
            return;
        }
        await prisma.user.delete({ where: { id: agent.id } });
        res.json({ message: 'Agente eliminado' });
    } catch {
        res.status(500).json({ error: 'Error al eliminar agente' });
    }
});

export default router;
