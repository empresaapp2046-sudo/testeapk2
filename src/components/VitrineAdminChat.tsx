// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Send, User, ChevronRight, Minimize2, Maximize2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface Message {
    sender: 'client' | 'admin';
    text: string;
    time: string;
    image?: string;
    clientName?: string;
}

interface ChatSession {
    storeSlug: string;
    clientName: string;
    messages: Message[];
    lastMessageTime: string;
    unreadCount: number;
}

export const VitrineAdminChat = () => {
    const { currentUser, settings } = useStore();
    const [activeChats, setActiveChats] = useState<ChatSession[]>([]);
    const [openChats, setOpenChats] = useState<string[]>([]); // Store client names of open chats
    const [minimizedChats, setMinimizedChats] = useState<string[]>([]);
    const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

    const loadAllChats = () => {
        const storeSlug = settings?.username || currentUser?.username;
        if (!storeSlug) return;

        const chatKey = `vitrine_chat_${storeSlug}`;
        const saved = localStorage.getItem(chatKey);
        
        if (saved) {
            try {
                const messages = JSON.parse(saved) as Message[];
                // Group by clientName (or use 'Visitante' if missing)
                const sessions: Record<string, Message[]> = {};
                messages.forEach(m => {
                    const name = m.clientName || 'Visitante';
                    if (!sessions[name]) sessions[name] = [];
                    sessions[name].push(m);
                });

                const chatSessions: ChatSession[] = Object.keys(sessions).map(name => ({
                    storeSlug,
                    clientName: name,
                    messages: sessions[name],
                    lastMessageTime: sessions[name][sessions[name].length - 1].time,
                    unreadCount: 0 // In localStorage version, we don't track unread easily across tabs
                }));

                setActiveChats(chatSessions);
            } catch (e) {
                console.warn("Error parsing vitrine chats", e);
            }
        }
    };

    useEffect(() => {
        loadAllChats();
        const interval = setInterval(loadAllChats, 3000);
        const handleStorage = (e: StorageEvent) => {
            if (e.key?.startsWith('vitrine_chat_')) loadAllChats();
        };
        window.addEventListener('storage', handleStorage);
        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', handleStorage);
        };
    }, [settings?.username, currentUser?.username]);

    const handleOpenChat = (clientName: string) => {
        if (openChats.includes(clientName)) {
            setMinimizedChats(prev => prev.filter(c => c !== clientName));
            return;
        }

        let newOpen = [...openChats];
        if (newOpen.length >= 3) {
            // Remove the oldest (first) one
            newOpen.shift();
        }
        newOpen.push(clientName);
        setOpenChats(newOpen);
        setMinimizedChats(prev => prev.filter(c => c !== clientName));
    };

    const handleCloseChat = (clientName: string) => {
        setOpenChats(prev => prev.filter(c => c !== clientName));
        setMinimizedChats(prev => prev.filter(c => c !== clientName));
    };

    const handleToggleMinimize = (clientName: string) => {
        setMinimizedChats(prev => 
            prev.includes(clientName) 
                ? prev.filter(c => c !== clientName) 
                : [...prev, clientName]
        );
    };

    const handleSend = (clientName: string) => {
        const text = replyTexts[clientName];
        if (!text?.trim()) return;

        const storeSlug = settings?.username || currentUser?.username;
        const chatKey = `vitrine_chat_${storeSlug}`;
        
        const newMsg: Message = { 
            sender: 'admin', 
            text: text.trim(), 
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            clientName
        };

        const currentChat = activeChats.find(c => c.clientName === clientName);
        const updatedMessages = currentChat ? [...currentChat.messages, newMsg] : [newMsg];
        
        // Update localStorage (all messages for this store)
        const allSaved = localStorage.getItem(chatKey);
        let allMessages: Message[] = [];
        if (allSaved) {
            allMessages = JSON.parse(allSaved);
        }
        allMessages.push(newMsg);
        localStorage.setItem(chatKey, JSON.stringify(allMessages));

        setReplyTexts(prev => ({ ...prev, [clientName]: '' }));
        loadAllChats();
    };

    if (!currentUser || currentUser.role === 'guest_user') return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex items-end gap-4 pointer-events-none">
            {/* Chat Windows */}
            <div className="flex items-end gap-4 pointer-events-auto">
                {openChats.map(clientName => {
                    const session = activeChats.find(s => s.clientName === clientName);
                    const isMinimized = minimizedChats.includes(clientName);

                    return (
                        <div 
                            key={clientName} 
                            className={`w-[320px] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 transition-all duration-300 ${isMinimized ? 'h-14' : 'h-[450px]'}`}
                        >
                            <div className="bg-indigo-600 text-white p-3 flex justify-between items-center shadow-md shrink-0 cursor-pointer" onClick={() => handleToggleMinimize(clientName)}>
                                <div className="flex items-center gap-2 truncate">
                                    <User size={16} className="text-indigo-200" />
                                    <span className="font-bold text-sm truncate">{clientName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); handleToggleMinimize(clientName); }} className="p-1 hover:bg-white/20 rounded">
                                        {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleCloseChat(clientName); }} className="p-1 hover:bg-white/20 rounded">
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {!isMinimized && (
                                <>
                                    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
                                        {session?.messages.map((msg, i) => (
                                            <div key={i} className={`flex flex-col ${msg.sender === 'admin' ? 'items-end' : 'items-start'}`}>
                                                <div className={`max-w-[85%] rounded-2xl p-2 text-sm ${msg.sender === 'admin' ? 'bg-indigo-600 text-white rounded-br-none shadow-sm' : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none shadow-sm'}`}>
                                                    {msg.image && (
                                                        <div className="mb-2 rounded-xl overflow-hidden bg-slate-100 max-w-full">
                                                            <img src={msg.image} alt="Produto" className="w-full h-auto object-cover max-h-32" />
                                                        </div>
                                                    )}
                                                    <p className="whitespace-pre-wrap leading-relaxed px-2">{msg.text}</p>
                                                </div>
                                                <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.time}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <form 
                                        onSubmit={(e) => { e.preventDefault(); handleSend(clientName); }} 
                                        className="p-2 bg-white border-t border-slate-200"
                                    >
                                        <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 p-1">
                                            <input 
                                                type="text" 
                                                className="flex-1 bg-transparent text-sm text-slate-800 px-3 py-1.5 outline-none placeholder:text-slate-400"
                                                placeholder="Resposta..."
                                                value={replyTexts[clientName] || ''}
                                                onChange={e => setReplyTexts(prev => ({ ...prev, [clientName]: e.target.value }))}
                                            />
                                            <button 
                                                type="submit"
                                                className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                                disabled={!replyTexts[clientName]?.trim()}
                                            >
                                                <Send size={14} />
                                            </button>
                                        </div>
                                    </form>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Chat List Trigger */}
            <div className="relative pointer-events-auto">
                <button 
                    onClick={() => {
                        // Toggle a side list or just show the first un-opened chat
                        if (activeChats.length > 0) {
                            const unopened = activeChats.find(c => !openChats.includes(c.clientName));
                            if (unopened) handleOpenChat(unopened.clientName);
                            else if (openChats.length > 0) handleToggleMinimize(openChats[0]);
                        }
                    }}
                    className="w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-indigo-700 hover:scale-110 transition-all relative group"
                >
                    <MessageCircle size={28} />
                    {activeChats.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                            {activeChats.length}
                        </span>
                    )}

                    {/* Popover List on Hover */}
                    <div className="absolute bottom-full right-0 mb-4 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                        <div className="bg-slate-900 text-white p-3 text-xs font-bold uppercase tracking-wider flex justify-between items-center">
                            <span>Conversas Ativas</span>
                            <span className="bg-indigo-600 px-2 py-0.5 rounded-full">{activeChats.length}</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {activeChats.length === 0 ? (
                                <div className="p-4 text-center text-slate-400 text-sm">Nenhuma conversa</div>
                            ) : (
                                activeChats.map(chat => (
                                    <button 
                                        key={chat.clientName}
                                        onClick={() => handleOpenChat(chat.clientName)}
                                        className={`w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${openChats.includes(chat.clientName) ? 'bg-indigo-50/50' : ''}`}
                                    >
                                        <div className="flex items-center gap-3 truncate">
                                            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
                                                <User size={16} />
                                            </div>
                                            <div className="text-left truncate">
                                                <p className="text-sm font-bold text-slate-800 truncate">{chat.clientName}</p>
                                                <p className="text-[10px] text-slate-400 truncate">{chat.messages[chat.messages.length - 1].text}</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={14} className="text-slate-300" />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );
};

