import { useEffect, useState } from 'react';
import api from '../lib/api';
import { MessageSquare, MoreVertical, User, Phone, ArrowRight, UserPlus, PhoneCall, FileText, Clock, X, ChevronRight, Calendar } from 'lucide-react';

interface Contact {
    id: string;
    name: string;
    phone: string;
    kanbanStatus: string;
    tags: string[];
}

interface Activity {
    id: string;
    type: string;
    description: string;
    duration: number | null;
    createdAt: string;
    user: { name: string };
}

interface Stats {
    totalCalls: number;
    totalMinutes: number;
}

const COLUMNS = [
    { id: 'lead', title: 'Lead', color: '#3b82f6' },
    { id: 'interesado', title: 'Interesado', color: '#f59e0b' },
    { id: 'presupuesto', title: 'Presupuesto', color: '#8b5cf6' },
    { id: 'cerrado', title: 'Cerrado', color: '#10b981' }
];

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
    call: { icon: '📞', color: 'text-emerald-400', label: 'Llamada' },
    note: { icon: '📝', color: 'text-blue-400', label: 'Nota' },
    status_change: { icon: '🔄', color: 'text-purple-400', label: 'Cambio de etapa' },
};

export default function KanbanPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);

    // History modal state
    const [historyContact, setHistoryContact] = useState<Contact | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [stats, setStats] = useState<Stats>({ totalCalls: 0, totalMinutes: 0 });
    const [historyLoading, setHistoryLoading] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Add call form
    const [callDesc, setCallDesc] = useState('');
    const [callDuration, setCallDuration] = useState('');
    const [callType, setCallType] = useState<'call' | 'note'>('call');
    const [submitting, setSubmitting] = useState(false);

    const fetchContacts = async () => {
        try {
            const { data } = await api.get('/contacts');
            setContacts(data.contacts || []);
        } catch (err) {
            console.error('Error fetching contacts for kanban:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    const moveContact = async (contactId: string, newStatus: string) => {
        try {
            await api.patch(`/contacts/${contactId}`, { kanbanStatus: newStatus });
            setContacts(prev => prev.map(c => c.id === contactId ? { ...c, kanbanStatus: newStatus } : c));
            // Refresh history if this contact's modal is open
            if (historyContact?.id === contactId) {
                fetchActivities(contactId);
            }
        } catch (err) {
            console.error('Error moving contact:', err);
        }
    };

    const fetchActivities = async (contactId: string, start?: string, end?: string) => {
        setHistoryLoading(true);
        try {
            const params: any = {};
            if (start) params.startDate = start;
            if (end) params.endDate = end;
            const { data } = await api.get(`/contacts/${contactId}/activities`, { params });
            setActivities(data.activities || []);
            setStats(data.stats || { totalCalls: 0, totalMinutes: 0 });
        } catch (err) {
            console.error('Error fetching activities:', err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const openHistory = (contact: Contact) => {
        setHistoryContact(contact);
        setActivities([]);
        setStats({ totalCalls: 0, totalMinutes: 0 });
        setStartDate('');
        setEndDate('');
        setCallDesc('');
        setCallDuration('');
        fetchActivities(contact.id);
    };

    const applyFilter = () => {
        if (historyContact) fetchActivities(historyContact.id, startDate, endDate);
    };

    const handleAddActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!historyContact || !callDesc) return;
        setSubmitting(true);
        try {
            await api.post(`/contacts/${historyContact.id}/activities`, {
                type: callType,
                description: callDesc,
                duration: callType === 'call' && callDuration ? parseInt(callDuration) : undefined
            });
            setCallDesc('');
            setCallDuration('');
            fetchActivities(historyContact.id, startDate, endDate);
        } catch (err) {
            console.error('Error adding activity:', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="p-8 space-y-8 bg-[#0f1117] min-h-full">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Embudo de Ventas</h1>
                    <p className="text-sm text-gray-400">Gestión visual de prospectos y conversiones</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-dark-700 text-gray-300 rounded-lg text-sm font-medium border border-dark-600 hover:bg-dark-600 transition-colors">Configurar Estados</button>
                    <button className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-bold hover:bg-brand-600 transition-shadow shadow-lg shadow-brand-500/20">Nuevo Lead</button>
                </div>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-dark-600">
                {COLUMNS.map(col => {
                    const columnContacts = contacts.filter(c => (c.kanbanStatus || 'lead').toLowerCase() === col.id);

                    return (
                        <div key={col.id} className="min-w-[320px] max-w-[320px] flex flex-col gap-4">
                            <div className="flex items-center justify-between px-2">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color, boxShadow: `0 0 10px ${col.color}` }} />
                                    {col.title}
                                    <span className="ml-2 bg-dark-700 text-gray-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                        {columnContacts.length}
                                    </span>
                                </span>
                                <button className="p-1 text-gray-600 hover:text-white transition-colors">
                                    <MoreVertical size={14} />
                                </button>
                            </div>

                            <div className="bg-dark-900/40 border border-dark-600/30 rounded-2xl p-3 min-h-[600px] flex flex-col gap-3">
                                {columnContacts.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center opacity-20 py-10">
                                        <UserPlus size={40} className="mb-2 text-gray-500" />
                                        <p className="text-[10px] text-gray-600 uppercase font-black tracking-tighter">Sin Prospectos</p>
                                    </div>
                                ) : (
                                    columnContacts.map(contact => (
                                        <div
                                            key={contact.id}
                                            className="group bg-[#1a1f2e] border border-[#2d3348] p-4 rounded-xl shadow-lg hover:border-brand-500/50 transition-all cursor-pointer relative overflow-hidden"
                                        >
                                            {/* Glow effect on hover */}
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity" />

                                            <div className="flex justify-between items-start mb-3 relative z-10">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-400 border border-brand-500/20">
                                                        <User size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-white leading-tight">{contact.name}</h3>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <Phone size={10} className="text-gray-500" />
                                                            <span className="text-[10px] text-gray-500">{contact.phone}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1 items-end">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            moveContact(contact.id, 'none');
                                                        }}
                                                        className="p-1 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-all mb-1"
                                                        title="Quitar del embudo"
                                                    >
                                                        <ArrowRight size={14} className="rotate-45" />
                                                    </button>
                                                    <span className="text-[9px] bg-dark-700 text-gray-400 px-1.5 py-0.5 rounded uppercase font-bold">ALTA</span>
                                                </div>
                                            </div>

                                            {contact.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mb-4 relative z-10">
                                                    {contact.tags.map(tag => (
                                                        <span key={tag} className="text-[9px] bg-brand-500/10 text-brand-400 px-1.5 py-0.5 rounded border border-brand-500/10 uppercase font-bold">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between border-t border-dark-600/30 pt-3 relative z-10">
                                                <div className="flex -space-x-1.5">
                                                    <div className="w-5 h-5 rounded-full border border-dark-900 bg-brand-500 flex items-center justify-center">
                                                        <MessageSquare size={10} className="text-white" />
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 items-center">
                                                    {/* History button */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openHistory(contact); }}
                                                        className="flex items-center gap-1 text-[10px] text-brand-400 hover:text-white bg-brand-500/10 hover:bg-brand-500/30 px-2 py-1 rounded transition-all font-bold"
                                                        title="Ver historial"
                                                    >
                                                        <FileText size={10} />
                                                        Historial
                                                    </button>

                                                    <select
                                                        onChange={(e) => moveContact(contact.id, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="bg-dark-800 text-[10px] text-gray-400 py-1 px-2 rounded border border-dark-600 focus:outline-none focus:border-brand-500"
                                                        value={col.id}
                                                    >
                                                        {COLUMNS.map(c => <option key={c.id} value={c.id}>Mover a {c.title}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ===== HISTORY MODAL ===== */}
            {historyContact && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#13161f] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center text-brand-400 border border-brand-500/20 text-lg font-black">
                                    {historyContact.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white">{historyContact.name}</h2>
                                    <p className="text-xs text-brand-400 font-mono">+{historyContact.phone}</p>
                                </div>
                            </div>
                            <button onClick={() => setHistoryContact(null)} className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Stats bar */}
                        <div className="grid grid-cols-2 gap-4 p-4 border-b border-white/5">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3">
                                <PhoneCall size={20} className="text-emerald-400" />
                                <div>
                                    <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-widest">Total Llamadas</p>
                                    <p className="text-2xl font-black text-white">{stats.totalCalls}</p>
                                </div>
                            </div>
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-center gap-3">
                                <Clock size={20} className="text-blue-400" />
                                <div>
                                    <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest">Minutos Totales</p>
                                    <p className="text-2xl font-black text-white">{stats.totalMinutes}</p>
                                </div>
                            </div>
                        </div>

                        {/* Date filter */}
                        <div className="flex items-center gap-3 px-6 py-3 border-b border-white/5">
                            <Calendar size={14} className="text-gray-500" />
                            <span className="text-xs text-gray-500 font-bold uppercase">Filtrar por fecha:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="bg-dark-800 border border-dark-600 text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:border-brand-500 outline-none"
                            />
                            <span className="text-gray-600 text-xs">→</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="bg-dark-800 border border-dark-600 text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:border-brand-500 outline-none"
                            />
                            <button
                                onClick={applyFilter}
                                className="px-3 py-1.5 bg-brand-500 text-white text-xs font-bold rounded-lg hover:bg-brand-600 transition-colors"
                            >
                                Filtrar
                            </button>
                            {(startDate || endDate) && (
                                <button
                                    onClick={() => { setStartDate(''); setEndDate(''); fetchActivities(historyContact.id); }}
                                    className="text-xs text-gray-500 hover:text-white transition-colors"
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>

                        {/* Add activity form */}
                        <form onSubmit={handleAddActivity} className="px-6 py-4 border-b border-white/5 flex flex-col gap-3">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Registrar actividad</p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCallType('call')}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${callType === 'call' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                >
                                    <PhoneCall size={12} /> Llamada
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCallType('note')}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${callType === 'note' ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                >
                                    <FileText size={12} /> Nota
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder={callType === 'call' ? 'Descripción de la llamada...' : 'Texto de la nota...'}
                                    value={callDesc}
                                    onChange={e => setCallDesc(e.target.value)}
                                    required
                                    className="flex-1 bg-dark-800 border border-dark-600 text-gray-200 text-sm rounded-lg px-3 py-2 focus:border-brand-500 outline-none placeholder-gray-600"
                                />
                                {callType === 'call' && (
                                    <input
                                        type="number"
                                        placeholder="Min."
                                        value={callDuration}
                                        onChange={e => setCallDuration(e.target.value)}
                                        min="1"
                                        className="w-20 bg-dark-800 border border-dark-600 text-gray-200 text-sm rounded-lg px-3 py-2 focus:border-brand-500 outline-none"
                                    />
                                )}
                                <button
                                    type="submit"
                                    disabled={submitting || !callDesc}
                                    className="px-4 py-2 bg-brand-500 text-white text-sm font-bold rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                                >
                                    <ChevronRight size={14} />
                                    {submitting ? '...' : 'Guardar'}
                                </button>
                            </div>
                        </form>

                        {/* Timeline */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-3">
                            {historyLoading ? (
                                <div className="flex items-center justify-center py-10">
                                    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : activities.length === 0 ? (
                                <div className="text-center py-10">
                                    <p className="text-4xl mb-3">📋</p>
                                    <p className="text-gray-500 text-sm font-medium">Sin actividades registradas</p>
                                    <p className="text-gray-600 text-xs mt-1">Registra una llamada o nota para comenzar</p>
                                </div>
                            ) : (
                                activities.map((activity, idx) => {
                                    const cfg = TYPE_CONFIG[activity.type] || { icon: '📌', color: 'text-gray-400', label: activity.type };
                                    return (
                                        <div key={activity.id} className="flex gap-4 group">
                                            {/* Timeline line */}
                                            <div className="flex flex-col items-center">
                                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-base flex-shrink-0 border border-white/10">
                                                    {cfg.icon}
                                                </div>
                                                {idx < activities.length - 1 && (
                                                    <div className="w-px flex-1 bg-white/5 mt-1" />
                                                )}
                                            </div>
                                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex-1 mb-2 group-hover:bg-white/[0.04] transition-colors">
                                                <div className="flex items-start justify-between mb-1">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
                                                    <span className="text-[10px] text-gray-600">{new Date(activity.createdAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p className="text-sm text-gray-300 leading-relaxed">{activity.description}</p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    {activity.duration && (
                                                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                            <Clock size={9} /> {activity.duration} min
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] text-gray-600">por {activity.user?.name || 'Sistema'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
