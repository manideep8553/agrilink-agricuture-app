import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiSend, FiSearch, FiArrowLeft, FiCheck, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { formatRelativeTime } from '../utils/helpers';
import api from '../utils/api';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  sender: { id: string; name: string; avatar?: string; role: string };
  isRead: boolean;
  createdAt: string;
}

interface Conversation {
  user: { id: string; name: string; avatar?: string; role: string };
  lastMessage: Message;
  unreadCount: number;
}

export default function ChatPage() {
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeChat) fetchMessages(activeChat);
  }, [activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    socket.on('chat:receive', (message: Message) => {
      if (activeChat && (message.senderId === activeChat || message.receiverId === activeChat)) {
        setMessages(prev => [...prev, message]);
      }
      fetchConversations();
    });

    socket.on('chat:sent', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('chat:typing', (data: { userId: string; isTyping: boolean }) => {
      if (data.userId === activeChat) setTyping(data.isTyping);
    });

    return () => {
      socket.off('chat:receive');
      socket.off('chat:sent');
      socket.off('chat:typing');
    };
  }, [socket, activeChat]);

  const fetchConversations = async () => {
    try {
      const { data } = await api.get('/chat/conversations');
      setConversations(data.conversations);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchMessages = async (otherUserId: string) => {
    try {
      const { data } = await api.get(`/chat/messages/${otherUserId}`);
      setMessages(data.messages);
    } catch (err) { console.error(err); }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !activeChat) return;

    socket.emit('chat:send', {
      receiverId: activeChat,
      content: newMessage.trim(),
    });
    setNewMessage('');
  };

  const handleTyping = (isTyping: boolean) => {
    if (socket && activeChat) {
      socket.emit('chat:typing', { receiverId: activeChat, isTyping });
    }
  };

  const activeUser = conversations.find(c => c.user.id === activeChat)?.user;

  return (
    <div className="min-h-screen pt-16 pb-0 px-0">
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className={`${showSidebar ? 'block' : 'hidden'} md:block w-full md:w-80 lg:w-96 border-r border-forest-200/20 bg-cream/80 backdrop-blur-xl`}>
          <div className="p-4">
            <h2 className="text-xl font-heading font-bold text-forest-700 mb-4">Messages</h2>
            <div className="relative mb-4">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" size={14} />
              <input type="text" className="w-full pl-9 pr-3 py-2 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 outline-none text-sm"
                placeholder="Search conversations..." />
            </div>
          </div>
          <div className="overflow-y-auto h-[calc(100%-5rem)]">
            {conversations.map((conv, i) => (
              <motion.button
                key={conv.user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.03 * i }}
                onClick={() => { setActiveChat(conv.user.id); setShowSidebar(false); }}
                className={`w-full text-left p-4 flex items-center space-x-3 hover:bg-forest-50 transition-colors border-b border-forest-200/10 ${activeChat === conv.user.id ? 'bg-forest-50' : ''}`}>
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-forest-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm">
                    {conv.user.name.charAt(0)}
                  </div>
                  {connected && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-cream" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-forest-700 truncate">{conv.user.name}</p>
                    <span className="text-[10px] text-forest-400">{formatRelativeTime(conv.lastMessage.createdAt)}</span>
                  </div>
                  <p className="text-xs text-forest-500 truncate mt-0.5">{conv.lastMessage.content}</p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="w-5 h-5 bg-amber-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold flex-shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </motion.button>
            ))}
            {conversations.length === 0 && !loading && (
              <div className="p-8 text-center">
                <p className="text-sm text-forest-400">No conversations yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${!showSidebar ? 'block' : 'hidden md:flex'}`}>
          {activeChat && activeUser ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-forest-200/20 glass flex items-center space-x-3">
                <button onClick={() => setShowSidebar(true)} className="md:hidden text-forest-600">
                  <FiArrowLeft size={20} />
                </button>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-forest-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm">
                  {activeUser.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-forest-700 text-sm">{activeUser.name}</p>
                  <p className="text-[10px] text-green-600">{connected ? 'Online' : 'Offline'}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => {
                  const isOwn = msg.senderId === user?.id;
                  const showAvatar = i === 0 || messages[i - 1]?.senderId !== msg.senderId;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-4' : 'mt-0.5'}`}>
                      <div className={`flex items-end space-x-2 max-w-[75%] ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        {showAvatar && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-forest-400 to-amber-400 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {msg.sender.name.charAt(0)}
                          </div>
                        )}
                        {!showAvatar && <div className="w-7 flex-shrink-0" />}
                        <div>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isOwn
                              ? 'bg-forest-700 text-cream rounded-br-md'
                              : 'bg-white border border-forest-100 text-forest-700 rounded-bl-md shadow-sm'
                          }`}>
                            {msg.content}
                          </div>
                          <div className={`flex items-center space-x-1 mt-0.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[10px] text-forest-400">{formatRelativeTime(msg.createdAt)}</span>
                            {isOwn && (
                              msg.isRead
                                ? <FiCheckCircle size={10} className="text-blue-500" />
                                : <FiCheck size={10} className="text-forest-300" />
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                {typing && (
                  <div className="flex items-center space-x-2 text-sm text-forest-400 italic">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-forest-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-forest-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-forest-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>typing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-forest-200/20 glass">
                <form onSubmit={sendMessage} className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onFocus={() => handleTyping(true)}
                    onBlur={() => handleTyping(false)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 outline-none text-sm"
                  />
                  <button type="submit" disabled={!newMessage.trim()}
                    className="p-2.5 bg-forest-700 hover:bg-forest-800 text-cream rounded-xl transition-all disabled:opacity-50">
                    <FiSend size={18} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-forest-100 to-amber-50 flex items-center justify-center text-3xl mx-auto mb-4">💬</div>
                <p className="text-forest-500">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
