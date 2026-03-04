import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface AuthSocket extends Socket {
    companyId?: string;
    userId?: string;
}

export const setupSocketIO = (io: Server): void => {
    // Middleware: authenticate socket connections
    io.use((socket: AuthSocket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const secret = process.env.JWT_SECRET || 'fallback-secret';
            const decoded = jwt.verify(token as string, secret) as {
                id: string;
                companyId: string;
            };

            socket.companyId = decoded.companyId;
            socket.userId = decoded.id;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket: AuthSocket) => {
        const companyId = socket.companyId!;
        console.log(`🔌 Socket connected: ${socket.id} (Company: ${companyId})`);

        // Join company room - all agents of same company share a room
        socket.join(`company:${companyId}`);

        socket.on('disconnect', () => {
            console.log(`🔌 Socket disconnected: ${socket.id}`);
        });

        // Client can request to join a specific chat room for typing indicators etc.
        socket.on('join_chat', (chatId: string) => {
            socket.join(`chat:${chatId}`);
        });

        socket.on('leave_chat', (chatId: string) => {
            socket.leave(`chat:${chatId}`);
        });
    });
};
