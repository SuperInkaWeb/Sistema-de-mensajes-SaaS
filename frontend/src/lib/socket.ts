import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
    if (!socket) {
        const token = useAuthStore.getState().token;
        const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/api$/, '');
        socket = io(baseUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
            console.log('🔌 Socket connected');
        });

        socket.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
        });

        socket.on('connect_error', (err) => {
            console.error('Socket error:', err.message);
        });
    }
    return socket;
};

export const disconnectSocket = (): void => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
