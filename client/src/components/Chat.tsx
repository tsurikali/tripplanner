import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getCurrentUser } from '../services/authService';
import toast from 'react-hot-toast';

interface Message {
  id: number;
  user_id: number;
  user_name: string;
  content: string;
  created_at: string;
}

interface ChatProps {
  tripId: number;
}

const Chat: React.FC<ChatProps> = ({ tripId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = getCurrentUser();

  // Подключение к WebSocket
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      auth: { token }
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Подключено к чату');
      setConnected(true);
      newSocket.emit('join-trip', tripId);
    });

    newSocket.on('message-history', (history: Message[]) => {
      console.log('📜 История сообщений:', history);
      setMessages(history);
      setLoading(false);
      scrollToBottom();
    });

    newSocket.on('new-message', (message: Message) => {
      console.log('📨 Новое сообщение:', message);
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    newSocket.on('message-error', (error: string) => {
      toast.error(error);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Отключено от чата');
      setConnected(false);
    });

    return () => {
      newSocket.close();
    };
  }, [tripId]);

  // Скролл к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !socket || !connected) return;

    socket.emit('send-message', {
      tripId,
      content: newMessage.trim()
    });

    setNewMessage('');
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long'
      });
    }
  };

  // Группируем сообщения по датам
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.created_at);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Загрузка чата...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Заголовок чата */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Чат путешествия</h3>
          <div className="flex items-center">
            <span className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-400' : 'bg-red-400'}`}></span>
            <span className="text-sm text-white opacity-90">
              {connected ? 'В сети' : 'Нет подключения'}
            </span>
          </div>
        </div>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            <div className="flex justify-center mb-4">
              <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                {date}
              </span>
            </div>
            {dateMessages.map((message) => {
              const isOwn = message.user_id === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                    {!isOwn && (
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mr-2">
                        {message.user_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      {!isOwn && (
                        <span className="text-xs text-gray-500 ml-2 mb-1 block">
                          {message.user_name}
                        </span>
                      )}
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      </div>
                      <span className={`text-xs text-gray-400 mt-1 block ${isOwn ? 'text-right' : 'text-left'}`}>
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Форма отправки */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Введите сообщение..."
            disabled={!connected}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={!connected || !newMessage.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Отправить
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
