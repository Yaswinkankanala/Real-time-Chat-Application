import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

const SocketContext = createContext(null);

const isDev = typeof window !== 'undefined' && (window.location.port === '5173' || window.location.port === '3000');
const defaultSocketUrl = isDev
  ? 'http://localhost:5000'
  : (typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'http://localhost:5000');

function normalizeSocketUrl() {
  try {
    if (typeof window !== 'undefined') {
      const custom = localStorage.getItem('chatsphere_backend_url');
      if (custom && custom.trim()) {
        return custom.trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');
      }
    }
  } catch (e) {}

  const direct = import.meta.env.VITE_SOCKET_URL;
  if (direct) return direct.trim().replace(/\/+$/, '');

  const fromApi = import.meta.env.VITE_API_URL;
  if (fromApi) return fromApi.trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');

  return defaultSocketUrl;
}

const SOCKET_SERVER_URL = normalizeSocketUrl();

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  // Active conversation target: { type: 'channel' | 'direct', id: string, details: object }
  const [activeTarget, setActiveTarget] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState({}); // userId -> displayName
  const [offlineNotice, setOfflineNotice] = useState(null); // Offline recipient notice

  const socketRef = useRef(null);
  const activeTargetRef = useRef(activeTarget);
  activeTargetRef.current = activeTarget;

  // Initialize Socket.io connection when token exists
  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const s = io(SOCKET_SERVER_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    s.on('connect', () => {
      setIsConnected(true);
      if (activeTargetRef.current?.type === 'channel') {
        s.emit('channel:join', activeTargetRef.current.id);
        s.emit('join_channel', activeTargetRef.current.id);
      }
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('presence:list', (list) => {
      setOnlineUserIds(Array.isArray(list) ? list : []);
    });

    // Handle incoming messages (supports both message:new and receive_channel_message)
    const handleIncomingMessage = (newMsg) => {
      const current = activeTargetRef.current;
      if (!current) return;

      const isCurrentChannel = current.type === 'channel' && newMsg.channelId === current.id;
      const isCurrentDirect =
        current.type === 'direct' &&
        ((newMsg.senderId === current.id && newMsg.recipientId === user?.id) ||
         (newMsg.senderId === user?.id && newMsg.recipientId === current.id));

      if (isCurrentChannel || isCurrentDirect) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }

      // Notify sidebar to refresh conversations list & latest message snippet
      try {
        window.dispatchEvent(new CustomEvent('chatsphere:conversation-updated'));
      } catch (e) {}
    };

    s.on('message:new', handleIncomingMessage);
    s.on('receive_channel_message', handleIncomingMessage);

    // Handle reaction updates
    s.on('message:updated', (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
      );
    });

    // Handle typing status updates
    s.on('typing:status', (data) => {
      const { userId, displayName, channelId, recipientId, isTyping } = data;
      const current = activeTargetRef.current;
      if (!current) return;

      const isForCurrentView =
        (current.type === 'channel' && channelId === current.id) ||
        (current.type === 'direct' && recipientId === user?.id && userId === current.id);

      if (isForCurrentView) {
        setTypingUsers((prev) => {
          const updated = { ...prev };
          if (isTyping) {
            updated[userId] = displayName;
          } else {
            delete updated[userId];
          }
          return updated;
        });
      }
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [token, user?.id]);

  // Handle switching active channels, DMs, or AI Agent
  const selectTarget = useCallback(async (type, id, details = {}) => {
    // Leave previous channel room if applicable
    if (socketRef.current && activeTargetRef.current?.type === 'channel') {
      socketRef.current.emit('channel:leave', activeTargetRef.current.id);
      socketRef.current.emit('leave_channel', activeTargetRef.current.id);
    }

    const newTarget = { type, id, details };
    setActiveTarget(newTarget);
    activeTargetRef.current = newTarget;
    setTypingUsers({});
    setOfflineNotice(null);

    // AI agent view manages its own conversations
    if (type === 'ai') {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    setLoadingMessages(true);

    try {
      if (type === 'channel') {
        if (socketRef.current) {
          socketRef.current.emit('channel:join', id);
          socketRef.current.emit('join_channel', id);
        }
        const { messages: msgs } = await api.getChannelMessages(id);
        setMessages(msgs || []);
      } else if (type === 'direct') {
        const { messages: msgs } = await api.getDirectMessages(id);
        setMessages(msgs || []);
      }
    } catch (err) {
      console.error('Failed to load target messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Exit currently opened chat, channel, or AI session and return to dashboard
  const exitActiveTarget = useCallback(() => {
    if (socketRef.current && activeTargetRef.current?.type === 'channel') {
      socketRef.current.emit('channel:leave', activeTargetRef.current.id);
      socketRef.current.emit('leave_channel', activeTargetRef.current.id);
    }

    setActiveTarget(null);
    activeTargetRef.current = null;
    setMessages([]);
    setTypingUsers({});
    setOfflineNotice(null);
    setLoadingMessages(false);
  }, []);

  // Send message with offline notification detection and immediate local update
  const sendMessage = useCallback(
    async ({ content, attachment = null }) => {
      if (!activeTarget) return;

      const isDirect = activeTarget.type === 'direct';
      const isChannel = activeTarget.type === 'channel';
      const payload = {
        channelId: isChannel ? activeTarget.id : null,
        recipientId: isDirect ? activeTarget.id : null,
        content,
        attachment
      };

      if (socketRef.current && isConnected) {
        return new Promise((resolve, reject) => {
          socketRef.current.emit('message:send', payload, (response) => {
            if (response?.error) {
              reject(new Error(response.error));
            } else {
              const msg = response?.message;
              if (msg) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === msg.id)) return prev;
                  return [...prev, msg];
                });
              }

              // Check if receiver is offline
              if (isDirect && response.isRecipientOffline) {
                setOfflineNotice(
                  'Your friend is currently offline. Your message will be delivered when they come online.'
                );
                setTimeout(() => {
                  setOfflineNotice((current) =>
                    current?.includes('offline') ? null : current
                  );
                }, 6000);
              }
              resolve(msg);
            }
          });
        });
      }

      // REST API fallback for channel messages if socket is reconnecting
      if (isChannel) {
        const res = await api.sendChannelMessage(activeTarget.id, { content, attachment });
        const fallbackMsg = res?.message;
        if (fallbackMsg) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === fallbackMsg.id)) return prev;
            return [...prev, fallbackMsg];
          });
          return fallbackMsg;
        }
      }

      throw new Error('Chat service is temporarily disconnected. Reconnecting...');
    },
    [activeTarget, isConnected]
  );

  // Send emoji reaction
  const sendReaction = useCallback((messageId, emoji) => {
    if (!socketRef.current) return;
    socketRef.current.emit('message:react', { messageId, emoji });
  }, []);

  // Typing indicators
  const sendTypingStatus = useCallback(
    (isTyping) => {
      if (!socketRef.current || !activeTarget) return;
      const eventName = isTyping ? 'typing:start' : 'typing:stop';
      socketRef.current.emit(eventName, {
        channelId: activeTarget.type === 'channel' ? activeTarget.id : null,
        recipientId: activeTarget.type === 'direct' ? activeTarget.id : null
      });
    },
    [activeTarget]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUserIds,
        activeTarget,
        messages,
        loadingMessages,
        typingUsers,
        offlineNotice,
        setOfflineNotice,
        selectTarget,
        exitActiveTarget,
        sendMessage,
        sendReaction,
        sendTypingStatus
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
