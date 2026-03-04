import { useState, useEffect } from 'react';
import api from '../lib/api';

interface Note {
    id: string;
    content: string;
    createdAt: string;
}

export default function NotesPanel() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const fetchNotes = async () => {
        try {
            const { data } = await api.get('/notes');
            setNotes(data.notes);
        } catch { /* silently ignore */ }
    };

    useEffect(() => {
        if (open) fetchNotes();
    }, [open]);

    const addNote = async () => {
        if (!newNote.trim()) return;
        setLoading(true);
        try {
            await api.post('/notes', { content: newNote.trim() });
            setNewNote('');
            fetchNotes();
        } catch { /* silently ignore */ } finally {
            setLoading(false);
        }
    };

    const deleteNote = async (id: string) => {
        try {
            await api.delete(`/notes/${id}`);
            setNotes(prev => prev.filter(n => n.id !== id));
        } catch { /* silently ignore */ }
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

    return (
        <div style={{ position: 'relative' }}>
            {/* Toggle button */}
            <button
                id="notes-panel-btn"
                onClick={() => setOpen(!open)}
                title="Mis Notas"
                style={{
                    width: '40px', height: '40px',
                    borderRadius: '10px',
                    border: 'none',
                    background: open ? '#16a34a' : 'transparent',
                    color: open ? '#ffffff' : '#8b949e',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                }}
                onMouseEnter={e => {
                    if (!open) {
                        (e.currentTarget as HTMLElement).style.background = '#21262d';
                        (e.currentTarget as HTMLElement).style.color = '#e6edf3';
                    }
                }}
                onMouseLeave={e => {
                    if (!open) {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = '#8b949e';
                    }
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                {notes.length > 0 && (
                    <span style={{
                        position: 'absolute', top: '4px', right: '4px',
                        background: '#16a34a', color: '#fff',
                        fontSize: '9px', fontWeight: '700',
                        borderRadius: '50%', width: '14px', height: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {notes.length > 9 ? '9+' : notes.length}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute right-0 top-12 w-80 bg-dark-800 border border-dark-600 rounded-2xl shadow-2xl z-50 flex flex-col max-h-[70vh]">
                    <div className="p-4 border-b border-dark-600 flex items-center justify-between">
                        <h3 className="font-semibold text-white text-sm">📝 Mis Notas</h3>
                        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                    </div>

                    {/* New note input */}
                    <div className="p-3 border-b border-dark-600">
                        <textarea
                            id="note-input"
                            className="input-field text-sm resize-none"
                            rows={2}
                            placeholder="Escribe una nota rápida..."
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) addNote(); }}
                        />
                        <button
                            id="add-note-btn"
                            onClick={addNote}
                            disabled={loading || !newNote.trim()}
                            className="btn-primary w-full text-sm py-2 mt-2"
                        >
                            {loading ? 'Guardando...' : '+ Agregar nota (Ctrl+Enter)'}
                        </button>
                    </div>

                    {/* Notes list */}
                    <div className="overflow-y-auto flex-1 p-3 space-y-2">
                        {notes.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">No hay notas aún</p>
                        ) : (
                            notes.map((note) => (
                                <div key={note.id} className="bg-dark-700 border border-dark-500 rounded-xl p-3 group">
                                    <p className="text-gray-200 text-sm whitespace-pre-wrap">{note.content}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-gray-500 text-xs">{formatDate(note.createdAt)}</span>
                                        <button
                                            onClick={() => deleteNote(note.id)}
                                            className="text-red-400 hover:text-red-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
