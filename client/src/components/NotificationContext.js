import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const useSocketEvent = (eventName, callback) => {
  const { socket } = useContext(NotificationContext);
  
  useEffect(() => {
    if (!socket) return;
    socket.on(eventName, callback);
    return () => socket.off(eventName, callback);
  }, [socket, eventName, callback]);
};

const SOCKET_URL = `http://${window.location.hostname}:5000`;

export const NotificationProvider = ({ children, userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState(null);
  const [socket, setSocket] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchSettings = async () => {
      try {
        const response = await axios.get(`${SOCKET_URL}/api/user-settings/${userId}`);
        setSoundEnabled(response.data.soundEnabled ?? true);
      } catch (error) {
        console.warn('Could not load user notification settings, defaulting to sound enabled');
      }
    };
    fetchSettings();
  }, [userId]);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      // Create oscillator for a simple ping sound if no file is provided
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  }, [soundEnabled]);

  // Initialize Socket.io
  useEffect(() => {
    if (!userId) return;

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.emit('join', userId);

    newSocket.on('new_notification', (notification) => {
      console.log('[SOCKET] Received notification:', notification);
      setLatestNotification(notification);
      setNotifications(prev => {
        // Check if notification already exists
        const exists = prev.some(n => n.id === notification.id);
        if (exists) return prev;
        
        setUnreadCount(c => c + 1);
        playNotificationSound();
        return [notification, ...prev];
      });
    });

    return () => newSocket.close();
  }, [userId, playNotificationSound]);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await axios.get(`${SOCKET_URL}/api/notifications/${userId}`);
      const data = response.data;
      
      const unread = data.filter(n => !n.is_read).length;
      setUnreadCount(unread);
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);



  const markAsRead = async (id) => {
    try {
      await axios.put(`${SOCKET_URL}/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    try {
      await axios.put(`${SOCKET_URL}/api/notifications/read-all/${userId}`);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      latestNotification,
      refresh: fetchNotifications,
      socket
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
