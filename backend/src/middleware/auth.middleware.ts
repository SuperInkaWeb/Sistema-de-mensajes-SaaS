import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        companyId: string;
        email: string;
        role: string;
        whatsappPhone?: string | null;
    };
}

export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }

        const token = authHeader.substring(7);
        const secret = process.env.JWT_SECRET || 'fallback-secret';

        const decoded = jwt.verify(token, secret) as {
            id: string;
            companyId: string;
            email: string;
            role: string;
        };

        // Verify user still exists
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, companyId: true, email: true, role: true, whatsappPhone: true },
        });

        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

export const requireAdmin = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void => {
    if (req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }
    next();
};
