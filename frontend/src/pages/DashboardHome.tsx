import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import api from '../lib/api';

interface Stats {
    instances: number;
    agents: number;
    notes: number;
}

export default function DashboardHome() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState<Stats>({ instances: 0, agents: 0, notes: 0 });

    useEffect(() => {
        const load = async () => {
            try {
                const [inst, notes] = await Promise.all([
                    api.get('/instances'),
                    api.get('/notes'),
                ]);
                const instances = inst.data.sessions?.length ?? 0;
                const notesCount = notes.data.notes?.length ?? 0;
                let agentsCount = 0;
                if (user?.role === 'admin') {
                    const ag = await api.get('/agents');
                    agentsCount = ag.data.agents?.length ?? 0;
                }
                setStats({ instances, agents: agentsCount, notes: notesCount });
            } catch { /* silently ignore */ }
        };
        load();
    }, []);

    const modules = [
        {
            path: '/chat',
            label: 'Bandeja de Mensajes',
            description: 'Gestiona todos los chats de WhatsApp en un solo lugar',
            color: '#3b82f6',
            bgColor: 'rgba(59,130,246,0.08)',
            borderColor: 'rgba(59,130,246,0.25)',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            ),
            stat: null,
        },
        {
            path: '/instances',
            label: 'WhatsApp / QR Codes',
            description: 'Conecta instancias de WhatsApp y gestiona campañas QR',
            color: '#22c55e',
            bgColor: 'rgba(34,197,94,0.08)',
            borderColor: 'rgba(34,197,94,0.25)',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5">
                    <rect x="5" y="2" width="14" height="20" rx="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
            ),
            stat: stats.instances,
            statLabel: 'instancias activas',
        },
        {
            path: '/agents',
            label: 'Sub Cuentas / Agentes',
            description: 'Administra agentes con número de WhatsApp propio',
            color: '#a855f7',
            bgColor: 'rgba(168,85,247,0.08)',
            borderColor: 'rgba(168,85,247,0.25)',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            ),
            stat: stats.agents,
            statLabel: 'agentes registrados',
        },
        {
            path: '/panel',
            label: 'Panel de Control',
            description: 'Edita tu perfil, contraseña y datos de la empresa',
            color: '#f59e0b',
            bgColor: 'rgba(245,158,11,0.08)',
            borderColor: 'rgba(245,158,11,0.25)',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    <path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
                </svg>
            ),
            stat: null,
        },
        {
            path: '/notes',
            label: 'Notas Rápidas',
            description: 'Apuntes y recordatorios para el equipo',
            color: '#ec4899',
            bgColor: 'rgba(236,72,153,0.08)',
            borderColor: 'rgba(236,72,153,0.25)',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="1.5">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
            ),
            stat: stats.notes,
            statLabel: 'notas guardadas',
        },
    ];

    return (
        <div style={{ padding: '28px', maxWidth: '1200px' }}>
            {/* Welcome header */}
            <div style={{ marginBottom: '28px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#f1f5f9' }}>
                    Bienvenido, {user?.name?.split(' ')[0]} 👋
                </h1>
                <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '14px' }}>
                    {user?.companyName} — Panel de Administración SuperInka SS
                </p>
            </div>

            {/* Stats bar */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginBottom: '28px',
            }}>
                {[
                    { label: 'WhatsApps conectados', value: stats.instances, color: '#22c55e' },
                    { label: 'Agentes / Sub-cuentas', value: stats.agents, color: '#a855f7' },
                    { label: 'Notas guardadas', value: stats.notes, color: '#ec4899' },
                ].map((s, i) => (
                    <div key={i} style={{
                        background: '#1a1f2e',
                        border: '1px solid #2d3348',
                        borderRadius: '12px',
                        padding: '20px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                    }}>
                        <div style={{
                            fontSize: '32px', fontWeight: '800', color: s.color,
                            fontVariantNumeric: 'tabular-nums',
                        }}>
                            {s.value}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '13px' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Modules grid */}
            <h2 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Módulos del Sistema
            </h2>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
            }}>
                {modules.map((mod) => (
                    <Link
                        key={mod.path}
                        to={mod.path}
                        style={{
                            textDecoration: 'none',
                            background: mod.bgColor,
                            border: `1px solid ${mod.borderColor}`,
                            borderRadius: '14px',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                            cursor: 'pointer',
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                            (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${mod.bgColor}`;
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.transform = 'none';
                            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            {mod.icon}
                            {mod.stat !== null && mod.stat !== undefined && (
                                <span style={{
                                    background: mod.color,
                                    color: '#fff',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    borderRadius: '20px',
                                    padding: '2px 10px',
                                }}>
                                    {mod.stat} {mod.statLabel}
                                </span>
                            )}
                        </div>
                        <div>
                            <div style={{ fontWeight: '700', fontSize: '15px', color: '#f1f5f9', marginBottom: '4px' }}>
                                {mod.label}
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                                {mod.description}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: mod.color, fontSize: '12px', fontWeight: '600' }}>
                            Abrir módulo
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
