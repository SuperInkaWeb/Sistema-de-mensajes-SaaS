import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Session {
    id: string;
    sessionName: string;
    phoneNumber: string | null;
}

interface Chat {
    id: string;
    remoteJid: string;
    contactName: string | null;
    lastMessagePreview: string | null;
    lastMessageAt: string | null;
    unreadCount: number;
    whatsappSession: Session;
}

interface Message {
    id: string;
    content: string | null;
    mediaUrl: string | null;
    messageType: string;
    timestamp: string;
    fromMe: boolean;
    senderId: string | null;
    waMessageId: string | null;
}

export default function ChatPage() {
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loadingChats, setLoadingChats] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchChats = useCallback(async () => {
        try {
            const { data } = await api.get('/chats');
            setChats(data.chats);
        } catch (err) {
            console.error('Failed to fetch chats:', err);
        } finally {
            setLoadingChats(false);
        }
    }, []);

    const fetchMessages = useCallback(async (chatId: string) => {
        setLoadingMessages(true);
        try {
            const { data } = await api.get(`/messages/${chatId}`);
            setMessages(data.messages);
            setTimeout(scrollToBottom, 100);
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    useEffect(() => {
        fetchChats();
    }, [fetchChats]);

    useEffect(() => {
        const socket = getSocket();

        // Listen for new messages in real-time
        socket.on('new_message', ({ message, chat }: { message: Message; chat: Chat }) => {
            // Update chat list
            setChats((prev) => {
                const existing = prev.find((c) => c.id === chat.id);
                if (existing) {
                    return prev
                        .map((c) =>
                            c.id === chat.id
                                ? {
                                    ...c,
                                    lastMessagePreview: chat.lastMessagePreview,
                                    lastMessageAt: chat.lastMessageAt,
                                    unreadCount: chat.unreadCount
                                }
                                : c
                        )
                        .sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
                } else {
                    return [chat, ...prev];
                }
            });

            // If this chat is selected, add message to view
            setSelectedChat((current) => {
                if (current?.id === chat.id) {
                    setMessages((prev) => {
                        // Avoid duplicates
                        if (prev.find(m => m.waMessageId === message.waMessageId)) return prev;
                        return [...prev, message];
                    });
                    setTimeout(scrollToBottom, 50);
                }
                return current;
            });
        });

        return () => {
            socket.off('new_message');
        };
    }, []);

    const handleSelectChat = async (chat: Chat) => {
        setSelectedChat(chat);
        // Reset unread count locally
        setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c)));
        await fetchMessages(chat.id);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat || sending) return;

        setSending(true);
        const text = newMessage;
        setNewMessage('');

        try {
            await api.post('/messages/send', {
                chatId: selectedChat.id,
                text,
            });
            // We don't add message here anymore, we wait for the socket 'new_message'
            // to ensure waMessageId is present and avoid duplicates.
        } catch (err) {
            console.error('Failed to send message:', err);
            setNewMessage(text); // Restore message on error
        } finally {
            setSending(false);
        }
    };

    const handleSendFile = async (file: File) => {
        if (!selectedChat || sending) return;

        setSending(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('chatId', selectedChat.id);

        try {
            await api.post('/messages/send-media', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            // Socket handles UI update
        } catch (err) {
            console.error('Failed to send file:', err);
            alert('Error al enviar el archivo');
        } finally {
            setSending(false);
        }
    };

    const filteredChats = chats.filter((c) =>
        (c.contactName || c.remoteJid).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

    const getAvatarColor = (str: string) => {
        const colors = [
            'bg-purple-700', 'bg-blue-700', 'bg-indigo-700',
            'bg-teal-700', 'bg-cyan-700', 'bg-orange-700',
        ];
        const idx = str.charCodeAt(0) % colors.length;
        return colors[idx];
    };

    return (
        <div className="flex h-full">
            {/* Chat List Sidebar */}
            <div className="w-80 bg-dark-800 border-r border-dark-600 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-dark-600">
                    <h2 className="text-lg font-semibold text-white mb-3">Bandeja Unificada</h2>
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Buscar conversación..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-dark-700 border border-dark-500 text-gray-300 placeholder-gray-600 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-brand-500"
                        />
                    </div>
                </div>

                {/* Chat list */}
                <div className="flex-1 overflow-y-auto">
                    {loadingChats ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filteredChats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-500 px-6 text-center">
                            <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            <p className="text-sm">No hay conversaciones aún</p>
                            <p className="text-xs mt-1">Conecta un WhatsApp primero</p>
                        </div>
                    ) : (
                        filteredChats.map((chat) => {
                            const name = chat.contactName || chat.remoteJid.split('@')[0];
                            const isSelected = selectedChat?.id === chat.id;
                            return (
                                <button
                                    key={chat.id}
                                    onClick={() => handleSelectChat(chat)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700 transition-colors duration-150 border-b border-dark-700/50 ${isSelected ? 'bg-dark-700 border-l-2 border-l-brand-500' : ''
                                        }`}
                                >
                                    {/* Avatar */}
                                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white ${getAvatarColor(name)}`}>
                                        {getInitials(name)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-200 truncate">{name}</span>
                                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                                {chat.lastMessageAt
                                                    ? formatDistanceToNow(new Date(chat.lastMessageAt), { locale: es, addSuffix: false })
                                                    : ''}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <span className="text-xs text-gray-400 truncate font-medium">
                                                {chat.lastMessagePreview?.startsWith('[') ? (
                                                    <span className="text-brand-400/80">{chat.lastMessagePreview}</span>
                                                ) : chat.lastMessagePreview || 'Sin mensajes'}
                                            </span>
                                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                                {/* WhatsApp session badge */}
                                                <span className="text-xs bg-dark-600 text-gray-400 px-1.5 py-0.5 rounded-md">
                                                    {chat.whatsappSession.sessionName}
                                                </span>
                                                {chat.unreadCount > 0 && (
                                                    <span className="w-5 h-5 bg-brand-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                                        {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col">
                {selectedChat ? (
                    <>
                        {/* Chat header */}
                        <div className="h-16 bg-dark-800 border-b border-dark-600 flex items-center px-6 gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${getAvatarColor(selectedChat.contactName || selectedChat.remoteJid)}`}>
                                {getInitials(selectedChat.contactName || selectedChat.remoteJid.split('@')[0])}
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">
                                    {selectedChat.contactName || selectedChat.remoteJid.split('@')[0]}
                                </h3>
                                <p className="text-xs text-gray-400">
                                    via <span className="text-brand-400">{selectedChat.whatsappSession.sessionName}</span>
                                    {selectedChat.whatsappSession.phoneNumber && ` · ${selectedChat.whatsappSession.phoneNumber}`}
                                </p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-3">
                            {loadingMessages ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-xs lg:max-w-md xl:max-w-lg rounded-2xl px-4 py-2.5 ${msg.fromMe
                                                ? 'bg-brand-700 text-white rounded-br-sm'
                                                : 'bg-dark-700 text-gray-200 rounded-bl-sm'
                                                }`}
                                        >
                                            {msg.messageType === 'image' && msg.mediaUrl && (
                                                <img
                                                    src={msg.mediaUrl}
                                                    alt="Imagen"
                                                    className="rounded-xl mb-2 max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => window.open(msg.mediaUrl!, '_blank')}
                                                />
                                            )}
                                            {msg.messageType === 'video' && msg.mediaUrl && (
                                                <video
                                                    src={msg.mediaUrl}
                                                    controls
                                                    className="rounded-xl mb-2 max-w-full"
                                                />
                                            )}
                                            {msg.messageType === 'audio' && msg.mediaUrl && (
                                                <audio
                                                    src={msg.mediaUrl}
                                                    controls
                                                    className="mb-2 w-full max-w-[200px]"
                                                />
                                            )}
                                            {msg.messageType === 'document' && msg.mediaUrl && (
                                                <div className="flex items-center gap-3 p-3 bg-dark-600 rounded-xl mb-2">
                                                    <svg className="w-8 h-8 text-brand-400" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm1 9h-6v2h6v-2zm-6 4h6v2h-6v-2zm1-9V3.5L18.5 8H14V5z" />
                                                    </svg>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-gray-300 truncate font-medium">Documento</p>
                                                        <button
                                                            onClick={() => window.open(msg.mediaUrl!, '_blank')}
                                                            className="text-[10px] text-brand-400 hover:underline"
                                                        >
                                                            Descargar archivo
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            {msg.messageType === 'sticker' && msg.mediaUrl && (
                                                <img
                                                    src={msg.mediaUrl}
                                                    alt="Sticker"
                                                    className="w-32 h-32 object-contain"
                                                />
                                            )}
                                            {msg.content && (
                                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                            )}
                                            {!msg.content && msg.messageType === 'text' && (
                                                <p className="text-sm text-gray-500 italic">Mensaje de texto</p>
                                            )}
                                            {!msg.content && !['image', 'video', 'audio', 'document', 'sticker', 'text'].includes(msg.messageType) && (
                                                <p className="text-sm text-gray-400 italic">[{msg.messageType}]</p>
                                            )}
                                            <p className={`text-xs mt-1 ${msg.fromMe ? 'text-brand-300' : 'text-gray-500'}`}>
                                                {new Date(msg.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message input */}
                        <form onSubmit={handleSendMessage} className="p-4 bg-dark-800 border-t border-dark-600 flex gap-3 items-center">
                            <input
                                type="file"
                                id="file-upload"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleSendFile(file);
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => document.getElementById('file-upload')?.click()}
                                className="p-2 text-gray-500 hover:text-brand-500 transition-colors"
                                disabled={sending}
                                title="Adjuntar archivo"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                            </button>
                            <input
                                id="message-input"
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Escribe un mensaje..."
                                className="flex-1 bg-dark-700 border border-dark-500 text-gray-100 placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500 transition-colors"
                                disabled={sending}
                            />
                            <button
                                id="send-btn"
                                type="submit"
                                disabled={!newMessage.trim() || sending}
                                className="btn-primary px-4 py-3 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </form>
                    </>
                ) : (
                    /* Empty state */
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <div className="w-24 h-24 bg-dark-700 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-300 mb-2">Selecciona una conversación</h3>
                        <p className="text-sm text-center max-w-xs">
                            Elige un chat de la lista para ver los mensajes y responder
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
