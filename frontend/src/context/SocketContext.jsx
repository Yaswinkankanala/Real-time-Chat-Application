import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

const SocketContext = createContext(null);

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Web Audio API notification chime generator (pleasant subtle notification)
function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // First note
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.25);

    // Second note
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Audio context may be restricted before user gesture
  }
}

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  
  // Active conversation target: { type: 'channel' | 'direct', id: string, details: object }
  const [activeTarget, setActiveTarget] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState({}); // userId -> { username, displayName }
  const [soundEnabled, setSoundEnabled] = useState(true);

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
      console.log('✅ Connected to WebSocket server with socket ID:', s.id);
      setIsConnected(true);
    });

    s.on('disconnect', (reason) => {
      console.warn('❌ Disconnected from WebSocket server:', reason);
      setIsConnected(false);
    });

    s.on('presence:list', (list) => {
      setOnlineUserIds(list);
    });

    // Handle incoming messages
    s.on('message:new', (newMsg) => {
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

      // Play sound notification if message is from another user
      if (newMsg.senderId !== user?.id && soundEnabled) {
        playNotificationChime();
      }
    });

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

  // Handle switching active channels or DMs
  const selectTarget = useCallback(async (type, id, details = {}) => {
    if (!socketRef.current) return;

    // Leave previous channel if applicable
    if (activeTargetRef.current?.type === 'channel') {
      socketRef.current.emit('channel:leave', activeTargetRef.current.id);
    }

    const newTarget = { type, id, details };
    setActiveTarget(newTarget);
    activeTargetRef.current = newTarget;
    setTypingUsers({});
    setLoadingMessages(true);

    try {
      if (type === 'channel') {
        socketRef.current.emit('channel:join', id);
        const { messages: msgs } = await api.getChannelMessages(id);
        setMessages(msgs);
      } else if (type === 'direct') {
        const { messages: msgs } = await api.getDirectMessages(id);
        setMessages(msgs);
      }
    } catch (err) {
      console.error('Failed to load target messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Send message
  const sendMessage = useCallback(
    async ({ content, attachment = null }) => {
      if (!socketRef.current || !activeTarget) return;

      const payload = {
        channelId: activeTarget.type === 'channel' ? activeTarget.id : null,
        recipientId: activeTarget.type === 'direct' ? activeTarget.id : null,
        content,
        attachment
      };

      return new Promise((resolve, reject) => {
        socketRef.current.emit('message:send', payload, (response) => {
          if (response?.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.message);
          }
        });
      });
    },
    [activeTarget]
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
        soundEnabled,
        setSoundEnabled,
        selectTarget,
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

