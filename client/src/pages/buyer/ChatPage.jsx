import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Send, MessageSquare } from 'lucide-react';
import api from '../../store/api/axios.js';
import { getActiveSocket } from '../../hooks/useSocket.js';

const ChatPage = () => {
  const { chatId } = useParams();
  const { user } = useSelector(s => s.auth);
  const [chats, setChats]       = useState([]);
  const [messages, setMessages] = useState([]);
  const [active, setActive]     = useState(chatId || null);
  const [input, setInput]       = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    api.get('/chats').then(({ data }) => setChats(data.data?.chats || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!active) return;
    api.get(`/chats/${active}`).then(({ data }) => setMessages(data.data?.messages || [])).catch(() => {});

    const socket = getActiveSocket();
    if (socket) {
      socket.emit('JOIN_CHAT', active);
      const handleIncomingMessage = ({ chatId: incomingChatId, message }) => {
        if (incomingChatId === active) {
          setMessages(prev => {
            if (message._id && prev.some(m => m._id === message._id)) return prev;
            return [...prev, message];
          });
        }
      };
      socket.on('NEW_MESSAGE', handleIncomingMessage);
      return () => {
        socket.emit('LEAVE_CHAT', active);
        socket.off('NEW_MESSAGE', handleIncomingMessage);
      };
    }
  }, [active]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !active) return;
    const currentInput = input.trim();
    const optimisticMsg = {
      content: currentInput,
      sender: { _id: user._id, name: user.name },
      type: 'text',
      createdAt: new Date(),
    };
    setMessages(m => [...m, optimisticMsg]);
    setInput('');

    try {
      const { data } = await api.post(`/chats/${active}/messages`, { content: currentInput });
      if (data.data?.message) {
        setMessages(prev => {
          const filtered = prev.filter(m => m !== optimisticMsg);
          return [...filtered, data.data.message];
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No conversations yet</div>
          ) : chats.map(chat => {
            const other = chat.participants?.find(p => p._id !== user?._id);
            return (
              <button key={chat._id} onClick={() => setActive(chat._id)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition border-b border-gray-100 ${active === chat._id ? 'bg-indigo-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                    {other?.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{other?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{chat.lastMessage?.content || 'Start a conversation'}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center"><MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-200" /><p>Select a conversation</p></div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => {
                const isMe = msg.sender?._id === user?._id || msg.sender === user?._id;
                return (
                  <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <button onClick={sendMessage} className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 transition">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
export default ChatPage;
