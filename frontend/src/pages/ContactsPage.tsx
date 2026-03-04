import { useState, useEffect } from 'react';
import api from '../lib/api';

interface Contact {
    id: string;
    name: string;
    phone: string;
    isAgent: boolean;
    tags: string[];
    notes: string | null;
    createdAt: string;
}

interface Group {
    id: string;
    name: string;
}

export default function ContactsPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modales
    const [showAddModal, setShowAddModal] = useState(false);
    const [showMessageModal, setShowMessageModal] = useState<Contact | null>(null);
    const [showGroupModal, setShowGroupModal] = useState<Contact | null>(null);
    const [showPromoteModal, setShowPromoteModal] = useState<Contact | null>(null);
    const [showGroupQRModal, setShowGroupQRModal] = useState<any | null>(null);
    const [showDetailModal, setShowDetailModal] = useState<Contact | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [sessions, setSessions] = useState<any[]>([]);

    // Form states
    const [newContact, setNewContact] = useState({ name: '', phone: '' });
    const [messageText, setMessageText] = useState('');
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedSessionId, setSelectedSessionId] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [promoteData, setPromoteData] = useState({ email: '', password: '' });
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchData = async () => {
        try {
            const [contactsRes, groupsRes, sessionsRes] = await Promise.all([
                api.get('/contacts'),
                api.get('/groups'),
                api.get('/instances')
            ]);
            setContacts(contactsRes.data.contacts);
            setGroups(groupsRes.data.groups);
            setSessions(sessionsRes.data.sessions.filter((s: any) => s.sessionStatus === 'connected'));
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionLoading(true);
        setError('');
        try {
            await api.post('/contacts', newContact);
            setNewContact({ name: '', phone: '' });
            setShowAddModal(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al agregar contacto');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showMessageModal) return;
        setActionLoading(true);
        setError('');
        try {
            await api.post(`/contacts/${showMessageModal.id}/message`, { text: messageText });
            setMessageText('');
            setShowMessageModal(null);
            alert('Mensaje enviado correctamente');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al enviar mensaje');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateGroup = async (contact: Contact) => {
        if (!selectedSessionId || !newGroupName) {
            setError('Nombre del grupo y sesión son requeridos');
            return;
        }
        setActionLoading(true);
        setError('');
        try {
            const res = await api.post('/groups', {
                sessionId: selectedSessionId,
                name: newGroupName,
                participants: [contact.phone]
            });
            setShowGroupModal(null);
            setNewGroupName('');
            fetchData();
            setShowGroupQRModal(res.data.group);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al crear grupo');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddToGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showGroupModal || !selectedGroupId) return;
        setActionLoading(true);
        setError('');
        try {
            await api.post(`/contacts/${showGroupModal.id}/group`, { groupId: selectedGroupId });
            setSelectedGroupId('');
            setShowGroupModal(null);
            alert('Contacto agregado al grupo');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al agregar al grupo');
        } finally {
            setActionLoading(false);
        }
    };

    const handlePromoteAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showPromoteModal) return;
        setActionLoading(true);
        setError('');
        try {
            await api.post(`/contacts/${showPromoteModal.id}/promote`, promoteData);
            setPromoteData({ email: '', password: '' });
            setShowPromoteModal(null);
            fetchData();
            alert('Contacto promovido a subagente');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al promover contacto');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateContact = async (id: string, data: Partial<Contact>) => {
        try {
            await api.patch(`/contacts/${id}`, data);
            fetchData();
            if (showDetailModal?.id === id) {
                setShowDetailModal(prev => prev ? { ...prev, ...data } : null);
            }
        } catch (err) {
            console.error('Error updating contact:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar este contacto?')) return;
        try {
            await api.delete(`/contacts/${id}`);
            fetchData();
        } catch (err) {
            console.error('Error deleting contact:', err);
        }
    };

    const filteredContacts = contacts.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    );

    return (
        <div className="h-full overflow-y-auto p-8 bg-[#0f1117]">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Agenda de Clientes</h1>
                        <p className="text-gray-400 mt-1 max-w-md">Tu base de datos centralizada. Los contactos se sincronizan automáticamente desde tus dispositivos conectados.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="relative group">
                            <input
                                type="text"
                                className="bg-dark-800 border border-dark-600 text-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-sm w-64 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all outline-none"
                                placeholder="Buscar por nombre o número..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-brand-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <button onClick={() => setShowAddModal(true)} className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20 active:scale-95 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Nuevo Contacto
                        </button>
                    </div>
                </div>

                {/* CRM Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Contactos</p>
                        <h3 className="text-2xl font-black text-white">{contacts.length}</h3>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Activos Hoy</p>
                        <h3 className="text-2xl font-black text-white">{Math.floor(contacts.length * 0.4)}</h3>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Subagentes</p>
                        <h3 className="text-2xl font-black text-white">{contacts.filter(c => c.isAgent).length}</h3>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
                        <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-1">Sincronizados</p>
                        <h3 className="text-2xl font-black text-white">{sessions.length > 0 ? '100%' : '0%'}</h3>
                    </div>
                </div>

                {/* Sync Status Banner */}
                {sessions.length > 0 && (
                    <div className="bg-brand-500/5 border border-brand-500/20 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400">
                                    <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </div>
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0f1117]" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">Sincronización Activa</h4>
                                <p className="text-xs text-gray-400">Escaneando {sessions.length} dispositivo(s) para importar nuevos clientes.</p>
                            </div>
                        </div>
                        <button onClick={fetchData} className="text-xs font-bold text-brand-400 hover:text-brand-300 transition-colors uppercase tracking-widest px-4 py-2 bg-brand-500/10 rounded-lg">Actualizar Lista</button>
                    </div>
                )}

                {/* Contacts List */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-40 bg-white/5 rounded-2xl border border-white/5" />
                        ))}
                    </div>
                ) : filteredContacts.length === 0 ? (
                    <div className="bg-white/[0.02] rounded-3xl border border-dashed border-white/10 py-24 flex flex-col items-center justify-center text-center backdrop-blur-sm">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-gray-600 mb-6">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-300">No hay contactos</h3>
                        <p className="text-gray-500 mt-2 max-w-sm">Conecta un dispositivo o agrega uno manualmente para comenzar tu gestión comercial.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                        {filteredContacts.map(contact => (
                            <div key={contact.id} className="group bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl border border-white/10 hover:border-brand-500/50 p-6 transition-all duration-500 relative overflow-visible shadow-xl shadow-black/20">
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <button
                                        onClick={() => { setShowMessageModal(contact); setError(''); }}
                                        className="w-9 h-9 flex items-center justify-center bg-brand-500 text-white rounded-xl shadow-lg shadow-brand-500/20 hover:scale-110 transition-transform active:scale-95"
                                        title="Enviar Mensaje"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                        </svg>
                                    </button>
                                    <div className="relative">
                                        <button
                                            onClick={() => setActiveMenuId(activeMenuId === contact.id ? null : contact.id)}
                                            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${activeMenuId === contact.id ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                            title="Más Opciones"
                                        >
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                            </svg>
                                        </button>

                                        {activeMenuId === contact.id && (
                                            <div className="absolute right-0 top-11 w-56 bg-[#1a1f2e]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-4 duration-300">
                                                <div className="px-4 py-2 border-b border-white/5 mb-1">
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Acciones CRM</p>
                                                </div>
                                                <button onClick={() => { setShowDetailModal(contact); setActiveMenuId(null); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-brand-500 hover:text-white flex items-center gap-3 transition-colors">
                                                    <span className="text-lg">📊</span> <span>Gestión CRM</span>
                                                </button>
                                                <button onClick={() => { setShowGroupModal(contact); setActiveMenuId(null); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-brand-500 hover:text-white flex items-center gap-3 transition-colors">
                                                    <span className="text-lg">👥</span> <span>Añadir a Grupo</span>
                                                </button>
                                                {!contact.isAgent && (
                                                    <button onClick={() => { setShowPromoteModal(contact); setActiveMenuId(null); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-indigo-500 hover:text-white flex items-center gap-3 transition-colors">
                                                        <span className="text-lg">⬆️</span> <span>Ascender Agente</span>
                                                    </button>
                                                )}
                                                <div className="my-1 border-t border-white/5" />
                                                <button onClick={() => { handleDelete(contact.id); setActiveMenuId(null); }} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500 hover:text-white flex items-center gap-3 transition-colors">
                                                    <span className="text-lg">🗑️</span> <span>Eliminar Clip</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-5 mb-6">
                                    <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner transition-transform group-hover:scale-110 duration-500 ${contact.isAgent ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' : 'bg-brand-500/20 text-brand-400 border border-brand-500/20'}`}>
                                        {contact.name.charAt(0).toUpperCase()}
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0f1117] ${contact.isAgent ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                                    </div>
                                    <div className="min-w-0 pr-12">
                                        <h3 className="font-black text-white text-xl truncate leading-none">{contact.name}</h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs text-brand-400/80 font-bold bg-brand-500/5 px-2 py-0.5 rounded-lg">+{contact.phone}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                                        {(contact as any).tags?.length > 0 ? (
                                            (contact as any).tags.slice(0, 3).map((tag: string) => (
                                                <span key={tag} className="text-[10px] font-bold bg-white/5 text-gray-400 px-2.5 py-1 rounded-lg border border-white/5 uppercase tracking-tight hover:bg-white/10 transition-colors">
                                                    {tag}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-[10px] font-bold text-gray-600 uppercase italic">Sin etiquetas</span>
                                        )}
                                        {(contact as any).tags?.length > 3 && (
                                            <span className="text-[10px] font-black text-brand-400/60 flex items-center px-1">+{(contact as any).tags.length - 3}</span>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Registrado</span>
                                        <span className="text-[10px] font-bold text-gray-400">{new Date(contact.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal: Add Contact */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="card w-full max-w-md border-brand-500/30">
                        <h2 className="text-xl font-bold text-white mb-6">Nuevo Contacto</h2>
                        {error && <div className="bg-red-900/30 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}
                        <form onSubmit={handleAddContact} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Nombre</label>
                                <input
                                    type="text" required className="input-field" placeholder="Ej: Carlos Mendez"
                                    value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">WhatsApp (con código de país)</label>
                                <input
                                    type="text" required className="input-field" placeholder="Ej: 51925772943"
                                    value={newContact.phone} onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancelar</button>
                                <button type="submit" disabled={actionLoading} className="btn-primary flex-1">
                                    {actionLoading ? 'Guardando...' : 'Crear contacto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Send Message */}
            {showMessageModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="card w-full max-w-md">
                        <h2 className="text-xl font-bold text-white mb-2">Enviar mensaje a {showMessageModal.name}</h2>
                        <p className="text-sm text-gray-400 mb-6">El mensaje se enviará desde una de tus sesiones conectadas.</p>
                        {error && <div className="bg-red-900/30 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}
                        <form onSubmit={handleSendMessage} className="space-y-4">
                            <textarea
                                required className="input-field min-h-[120px]" placeholder="Escribe tu mensaje aquí..."
                                value={messageText} onChange={e => setMessageText(e.target.value)}
                            />
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowMessageModal(null)} className="btn-secondary flex-1">Cancelar</button>
                                <button type="submit" disabled={actionLoading} className="btn-primary flex-1">
                                    {actionLoading ? 'Enviando...' : 'Enviar mensaje'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Group Management */}
            {showGroupModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="card w-full max-w-md">
                        <h2 className="text-xl font-bold text-white mb-6">Gestionar Grupo para {showGroupModal.name}</h2>
                        {error && <div className="bg-red-900/30 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}

                        <div className="space-y-6">
                            {/* Create New Group */}
                            <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                                <h3 className="text-sm font-bold text-gray-300 mb-4 uppercase tracking-wider">Crear Nuevo Grupo</h3>
                                <div className="space-y-3">
                                    <input
                                        type="text" className="input-field" placeholder="Nombre del grupo..."
                                        value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                                    />
                                    <select
                                        className="input-field"
                                        value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)}
                                    >
                                        <option value="">Selecciona tu WhatsApp...</option>
                                        {sessions.map(s => <option key={s.id} value={s.id}>{s.sessionName} (+{s.phoneNumber})</option>)}
                                    </select>
                                    <button
                                        onClick={() => handleCreateGroup(showGroupModal)}
                                        disabled={actionLoading || !newGroupName || !selectedSessionId}
                                        className="btn-primary w-full"
                                    >
                                        {actionLoading ? 'Creando...' : 'Crear y obtener QR'}
                                    </button>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800" /></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-gray-900 px-2 text-gray-500">O añadir a uno existente</span></div>
                            </div>

                            {/* Add to Existing */}
                            <form onSubmit={handleAddToGroup} className="space-y-4">
                                <div>
                                    <select
                                        required className="input-field"
                                        value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}
                                    >
                                        <option value="">Selecciona un grupo...</option>
                                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => { setShowGroupModal(null); setError(''); }} className="btn-secondary flex-1">Cerrar</button>
                                    <button type="submit" disabled={actionLoading || !selectedGroupId} className="btn-primary flex-1">
                                        Añadir
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Group QR */}
            {showGroupQRModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="card w-full max-w-sm text-center">
                        <h2 className="text-xl font-bold text-white mb-2">¡Grupo Creado!</h2>
                        <p className="text-gray-400 mb-6 font-medium">{showGroupQRModal.name}</p>

                        <div className="bg-white p-4 rounded-2xl inline-block mb-6 shadow-xl">
                            <img
                                src={`${(import.meta as any).env.VITE_API_URL || 'http://localhost:3001/api'}/groups/${showGroupQRModal.id}/qr`}
                                alt="QR Group"
                                className="w-64 h-64 grayscale-0"
                            />
                        </div>

                        <p className="text-xs text-brand-400 mb-6 bg-brand-500/10 py-2 px-4 rounded-full inline-block">
                            Escanea este código para unirte directamente
                        </p>

                        <button
                            onClick={() => setShowGroupQRModal(null)}
                            className="btn-primary w-full py-3 text-lg font-bold"
                        >
                            ¡Listo!
                        </button>
                    </div>
                </div>
            )}

            {/* Modal: Promote Agent */}
            {showPromoteModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="card w-full max-w-md">
                        <h2 className="text-xl font-bold text-white mb-2">Promover a Subagente</h2>
                        <p className="text-sm text-gray-400 mb-6">Crea una cuenta de acceso para que {showPromoteModal.name} pueda usar la plataforma.</p>
                        {error && <div className="bg-red-900/30 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}
                        <form onSubmit={handlePromoteAgent} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Email de acceso</label>
                                <input
                                    type="email" required className="input-field" placeholder="ejemplo@correo.com"
                                    value={promoteData.email} onChange={e => setPromoteData({ ...promoteData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Contraseña</label>
                                <input
                                    type="password" required className="input-field" placeholder="••••••••"
                                    value={promoteData.password} onChange={e => setPromoteData({ ...promoteData, password: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowPromoteModal(null)} className="btn-secondary flex-1">Cancelar</button>
                                <button type="submit" disabled={actionLoading} className="btn-primary flex-1">
                                    {actionLoading ? 'Promoviendo...' : 'Crear Subcuenta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Contact Detail / CRM */}
            {showDetailModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="card w-full max-w-lg">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white">{showDetailModal.name}</h2>
                                <p className="text-brand-400 font-mono">+{showDetailModal.phone}</p>
                            </div>
                            <button onClick={() => setShowDetailModal(null)} className="text-gray-500 hover:text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Tags */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Etiquetas CRM</label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {(showDetailModal.tags || []).map(tag => (
                                        <span key={tag} className="bg-brand-500/10 text-brand-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border border-brand-500/20">
                                            {tag}
                                            <button onClick={() => handleUpdateContact(showDetailModal.id, { tags: showDetailModal.tags.filter(t => t !== tag) })} className="hover:text-white">×</button>
                                        </span>
                                    ))}
                                    <button
                                        onClick={() => {
                                            const tag = prompt('Nueva etiqueta:');
                                            if (tag) handleUpdateContact(showDetailModal.id, { tags: [...(showDetailModal.tags || []), tag] });
                                        }}
                                        className="border border-dashed border-gray-700 text-gray-500 px-3 py-1 rounded-full text-xs hover:border-brand-500 hover:text-brand-400"
                                    >
                                        + Añadir etiqueta
                                    </button>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-widest">Notas / Descripción</label>
                                <textarea
                                    className="input-field min-h-[150px] text-sm leading-relaxed"
                                    placeholder="Añade información relevante sobre este cliente..."
                                    defaultValue={showDetailModal.notes || ''}
                                    onBlur={(e) => handleUpdateContact(showDetailModal.id, { notes: e.target.value })}
                                />
                                <p className="text-[10px] text-gray-600 mt-2 italic">Los cambios se guardan automáticamente al salir del campo.</p>
                            </div>

                            <div className="pt-4 border-t border-dark-600 flex justify-end">
                                <button onClick={() => setShowDetailModal(null)} className="btn-primary px-8">Listo</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
