import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';

export default function DashboardLayout() {
    const { user, logout, originalAdminToken, switchBack } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const isAdmin = user?.role === 'admin';
    const isImpersonating = !!originalAdminToken;

    useEffect(() => { getSocket(); }, []);
    const handleLogout = () => { logout(); navigate('/login'); };
    const handleSwitchBack = () => { switchBack(); };


    const navItems = [
        {
            label: 'PRINCIPAL',
            type: 'header'
        },
        {
            path: '/',
            exact: true,
            label: 'Informes / Dashboard',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                </svg>
            ),
        },
        {
            path: '/reports',
            exact: false,
            label: 'Informe Diario',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                </svg>
            ),
        },

        {
            label: 'MENSAJERÍA',
            type: 'header'
        },
        {
            path: '/chat',
            exact: false,
            label: 'Bandeja de Mensajes',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            ),
        },
        {
            path: '/quick-replies',
            exact: false,
            label: 'Respuestas Rápidas',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
            ),
        },
        {
            label: 'CLIENTES',
            type: 'header'
        },
        {
            path: '/contacts',
            exact: false,
            label: 'Contactos / Agenda',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                </svg>
            ),
        },
        {
            path: '/kanban',
            exact: false,
            label: 'Embudo de Ventas',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="3" width="6" height="6" rx="1" /><rect x="3" y="15" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" />
                </svg>
            ),
        },
        {
            label: 'ADMINISTRACIÓN',
            type: 'header'
        },
        {
            path: '/instances',
            exact: false,
            label: 'Conexiones / QR',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
            ),
        },
        {
            path: '/agents',
            exact: false,
            label: 'Usuarios / Agentes',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            ),
        },
        {
            path: '/groups',
            exact: false,
            label: 'Manejo de Grupos',
            adminOnly: true,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    <line x1="19" y1="8" x2="23" y2="8" />
                    <line x1="21" y1="6" x2="21" y2="10" />
                </svg>
            ),
        },
    ];

    const isActive = (path: string, exact: boolean) =>
        exact ? location.pathname === path : location.pathname.startsWith(path);

    const sidebarW = sidebarCollapsed ? '64px' : '240px';

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#0f1117', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>

            {/* ═══════════════ SIDEBAR ═══════════════ */}
            <aside style={{
                width: sidebarW,
                minWidth: sidebarW,
                background: 'linear-gradient(180deg, #1a1f2e 0%, #141824 100%)',
                borderRight: '1px solid #2d3348',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.25s ease',
                overflow: 'hidden',
                zIndex: 20,
                boxShadow: '4px 0 20px rgba(0,0,0,0.3)',
            }}>

                {/* Logo header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '18px 16px',
                    borderBottom: '1px solid #2d3348',
                    minHeight: '64px',
                }}>
                    <div style={{
                        width: '36px', height: '36px', minWidth: '36px',
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 448 512" fill="white">
                            <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6z" />
                        </svg>
                    </div>
                    {!sidebarCollapsed && (
                        <div>
                            <div style={{ fontWeight: '800', fontSize: '15px', color: '#f1f5f9', lineHeight: '1.2' }}>SuperInka SS</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>Panel de Administración</div>
                        </div>
                    )}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        style={{
                            marginLeft: 'auto', border: 'none', background: 'transparent',
                            color: '#64748b', cursor: 'pointer', padding: '4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            minWidth: '24px',
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {sidebarCollapsed
                                ? <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
                                : <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
                            }
                        </svg>
                    </button>
                </div>

                {/* User info */}
                {!sidebarCollapsed && (
                    <div style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #2d3348',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                    }}>
                        <div style={{
                            width: '34px', height: '34px', minWidth: '34px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', fontWeight: '700', color: '#fff',
                        }}>
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: '600', fontSize: '13px', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                            <div style={{ fontSize: '11px', color: '#4ade80' }}>{user?.role === 'admin' ? '⚡ Administrador' : '👤 Agente'}</div>
                        </div>
                    </div>
                )}

                {/* Nav section label */}
                {!sidebarCollapsed && (
                    <div style={{ padding: '12px 16px 6px', fontSize: '10px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Navegación
                    </div>
                )}

                {/* Nav items */}
                <nav style={{ flex: 1, padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
                    {navItems.filter(item => !(item as any).adminOnly || isAdmin).map((item, idx) => {
                        if (item.type === 'header') {
                            return !sidebarCollapsed ? (
                                <div key={`header-${idx}`} style={{
                                    padding: '16px 12px 6px',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    color: '#475569',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em'
                                }}>
                                    {item.label}
                                </div>
                            ) : <div key={`spacer-${idx}`} style={{ height: '8px' }} />;
                        }

                        const active = item.path ? isActive(item.path, !!item.exact) : false;
                        return (
                            <Link
                                key={item.path || idx}
                                to={item.path || '#'}
                                title={sidebarCollapsed ? item.label : undefined}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: sidebarCollapsed ? '10px 13px' : '9px 12px',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    color: active ? '#ffffff' : '#94a3b8',
                                    background: active ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'transparent',
                                    fontWeight: active ? '600' : '400',
                                    fontSize: '13.5px',
                                    transition: 'all 0.15s',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    boxShadow: active ? '0 2px 8px rgba(22,163,74,0.35)' : 'none',
                                }}
                                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#1e2535'; }}
                                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                            >
                                <span style={{ minWidth: '18px', display: 'flex' }}>{item.icon}</span>
                                {!sidebarCollapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom: logout */}
                <div style={{ padding: '8px', borderTop: '1px solid #2d3348' }}>
                    <button
                        onClick={handleLogout}
                        title="Cerrar sesión"
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: sidebarCollapsed ? '10px 13px' : '9px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'transparent',
                            color: '#64748b',
                            cursor: 'pointer',
                            fontSize: '13.5px',
                            transition: 'all 0.15s',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)';
                            (e.currentTarget as HTMLElement).style.color = '#f87171';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                            (e.currentTarget as HTMLElement).style.color = '#64748b';
                        }}
                    >
                        <span style={{ minWidth: '18px', display: 'flex' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                        </span>
                        {!sidebarCollapsed && <span>Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>

            {/* ═══════════════ MAIN AREA ═══════════════ */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

                {/* Top bar */}
                <header style={{
                    height: '56px',
                    background: '#1a1f2e',
                    borderBottom: '1px solid #2d3348',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 24px',
                    gap: '16px',
                    flexShrink: 0,
                }}>
                    <div style={{ flex: 1 }}>
                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                            {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: '#22c55e',
                            boxShadow: '0 0 6px #22c55e',
                        }} />
                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>Sistema activo</span>
                    </div>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '6px 12px',
                        background: '#242938',
                        borderRadius: '8px',
                        border: '1px solid #2d3348',
                    }}>
                        <div style={{
                            width: '28px', height: '28px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: '700', color: '#fff',
                        }}>
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '500' }}>{user?.name}</span>
                    </div>
                </header>

                {/* Impersonation Banner */}
                {isImpersonating && (
                    <div style={{
                        background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                        color: '#000',
                        padding: '10px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontWeight: '600',
                        fontSize: '14px',
                        boxShadow: '0 4px 12px rgba(245,158,11,0.2)',
                        zIndex: 10,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            <span>Estás visualizando la cuenta de: <span style={{ textDecoration: 'underline' }}>{user?.name}</span> (Modo Simulación)</span>
                        </div>
                        <button
                            onClick={handleSwitchBack}
                            style={{
                                background: '#000',
                                color: '#fff',
                                padding: '6px 14px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '700',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                            Volver a modo Administrador
                        </button>
                    </div>
                )}

                {/* Page content */}
                <main style={{ flex: 1, overflow: 'auto' }}>
                    <Outlet />
                </main>

            </div>
        </div>
    );
}
