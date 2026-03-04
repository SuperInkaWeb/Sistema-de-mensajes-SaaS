import { useState } from 'react';

export default function QuickRepliesPage() {
    const [search, setSearch] = useState('');

    return (
        <div className="p-8 space-y-8 bg-[#0f1117] min-h-full">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Respuestas Rápidas</h1>
                    <p className="text-sm text-gray-400">Atajos de teclado para tus agentes</p>
                </div>
                <button className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20 active:scale-95">
                    + Nueva Respuesta
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-dark-800/80 p-6 rounded-2xl border border-dashed border-dark-600 flex flex-col items-center justify-center text-center space-y-4 py-12">
                    <div className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    </div>
                    <div>
                        <p className="text-gray-300 font-bold">Sin respuestas aún</p>
                        <p className="text-xs text-gray-500 max-w-[200px] mt-1">Crea atajos como "/bienvenida" para responder en segundos.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
