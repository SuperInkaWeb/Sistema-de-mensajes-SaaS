import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    companyId: string;
    companyName: string;
}

export interface AuthState {
    token: string | null;
    user: User | null;
    originalAdminToken: string | null; // Guardar el token de admin original
    originalAdminUser: User | null;   // Guardar los datos de admin original
    setAuth: (token: string, user: User) => void;
    logout: () => void;
    impersonate: (token: string, user: User) => void;
    switchBack: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            originalAdminToken: null,
            originalAdminUser: null,
            setAuth: (token, user) => set({ token, user, originalAdminToken: null, originalAdminUser: null }),
            logout: () => set({ token: null, user: null, originalAdminToken: null, originalAdminUser: null }),
            impersonate: (token, user) => set((state) => ({
                originalAdminToken: state.originalAdminToken || state.token,
                originalAdminUser: state.originalAdminUser || state.user,
                token,
                user
            })),
            switchBack: () => set((state) => ({
                token: state.originalAdminToken,
                user: state.originalAdminUser,
                originalAdminToken: null,
                originalAdminUser: null
            })),
        }),
        {
            name: 'auth-storage',
        }
    )
);

