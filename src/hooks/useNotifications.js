import { useEffect } from 'react';
import { connectSocket } from '../utils/socket';

export const useNotifications = () => {
    useEffect(() => {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const socket = connectSocket();
        socket.on('new_message', (msg) => {
            if (document.hidden) {
                new Notification('New message', { body: msg.text });
            }
        });

        return () => {
            socket.off('new_message');
        };
    }, []);
};
