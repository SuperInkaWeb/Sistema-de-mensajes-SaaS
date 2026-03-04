import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
    try {
        const { companyName, email, password, name } = req.body;

        if (!companyName || !email || !password || !name) {
            res.status(400).json({ error: 'All fields are required' });
            return;
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(409).json({ error: 'Email already registered' });
            return;
        }

        // Create company and admin user in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const company = await tx.company.create({
                data: {
                    name: companyName,
                    planStatus: 'active',
                },
            });

            const passwordHash = await bcrypt.hash(password, 12);

            const user = await tx.user.create({
                data: {
                    companyId: company.id,
                    email,
                    passwordHash,
                    name,
                    role: 'admin',
                },
            });

            // Automatically create 4 agents for the new company
            const agents = [
                { name: 'Agente 1', email: `agente1@${email.split('@')[1]}` },
                { name: 'Agente 2', email: `agente2@${email.split('@')[1]}` },
                { name: 'Agente 3', email: `agente3@${email.split('@')[1]}` },
                { name: 'Agente 4', email: `agente4@${email.split('@')[1]}` },
            ];

            for (const agentData of agents) {
                await tx.user.create({
                    data: {
                        companyId: company.id,
                        email: agentData.email,
                        passwordHash,
                        name: agentData.name,
                        role: 'agent',
                    },
                });
            }

            return { company, user };

        });

        const secret = process.env.JWT_SECRET || 'fallback-secret';
        const expiresIn = (process.env.JWT_EXPIRES_IN || '7d');
        const token = jwt.sign(
            {
                id: result.user.id,
                companyId: result.user.companyId,
                email: result.user.email,
                role: result.user.role,
            },
            secret,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { expiresIn } as any
        );

        res.status(201).json({
            token,
            user: {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name,
                role: result.user.role,
                companyId: result.user.companyId,
                companyName: result.company.name,
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { email },
            include: { company: true },
        });

        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        if (user.company.planStatus !== 'active') {
            res.status(403).json({ error: 'Company subscription is inactive' });
            return;
        }

        const secret = process.env.JWT_SECRET || 'fallback-secret';
        const expiresIn = (process.env.JWT_EXPIRES_IN || '7d');
        const token = jwt.sign(
            {
                id: user.id,
                companyId: user.companyId,
                email: user.email,
                role: user.role,
            },
            secret,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { expiresIn } as any
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                companyId: user.companyId,
                companyName: user.company.name,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// POST /api/auth/invite-agent (admin only)
router.post('/invite-agent', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, name, companyId } = req.body;

        if (!email || !password || !name || !companyId) {
            res.status(400).json({ error: 'All fields are required' });
            return;
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(409).json({ error: 'Email already registered' });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                companyId,
                email,
                passwordHash,
                name,
                role: 'agent',
            },
        });

        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                companyId: user.companyId,
            },
        });
    } catch (error) {
        console.error('Invite agent error:', error);
        res.status(500).json({ error: 'Failed to create agent' });
    }
});

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token' });
            return;
        }

        const token = authHeader.substring(7);
        const secret = process.env.JWT_SECRET || 'fallback-secret';
        const decoded = jwt.verify(token, secret) as { id: string };

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: { company: true },
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                companyId: user.companyId,
                companyName: user.company.name,
            },
        });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// PATCH /api/auth/profile - Editar datos del perfil actual
router.patch('/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, email, password, companyName } = req.body;
        const userId = req.user!.id;
        const companyId = req.user!.companyId;

        const updateUser: any = {};
        if (name) updateUser.name = name;
        if (email) {
            const existing = await prisma.user.findFirst({ where: { email, NOT: { id: userId } } });
            if (existing) { res.status(409).json({ error: 'Email ya en uso' }); return; }
            updateUser.email = email;
        }
        if (password) updateUser.passwordHash = await bcrypt.hash(password, 12);

        const user = await prisma.user.update({
            where: { id: userId },
            data: updateUser,
            include: { company: true },
        });

        if (companyName && req.user!.role === 'admin') {
            await prisma.company.update({ where: { id: companyId }, data: { name: companyName } });
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                companyId: user.companyId,
                companyName: companyName || user.company.name,
            },
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

// POST /api/auth/impersonate/:id (Admin only)
router.post('/impersonate/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (req.user!.role !== 'admin') {
            res.status(403).json({ error: 'Solo los administradores pueden simular agentes' });
            return;
        }

        const agent = await prisma.user.findFirst({
            where: {
                id: req.params.id,
                companyId: req.user!.companyId,
                role: 'agent'
            },
            include: { company: true }
        });

        if (!agent) {
            res.status(404).json({ error: 'Agente no encontrado' });
            return;
        }

        const secret = process.env.JWT_SECRET || 'fallback-secret';
        const expiresIn = (process.env.JWT_EXPIRES_IN || '7d');
        const token = jwt.sign(
            {
                id: agent.id,
                companyId: agent.companyId,
                email: agent.email,
                role: agent.role,
            },
            secret,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { expiresIn } as any
        );

        res.json({
            token,
            user: {
                id: agent.id,
                email: agent.email,
                name: agent.name,
                role: agent.role,
                companyId: agent.companyId,
                companyName: agent.company.name,
            },
        });
    } catch (error) {
        console.error('Impersonation error:', error);
        res.status(500).json({ error: 'Error al simular agente' });
    }
});

export default router;

