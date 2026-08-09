import { io } from 'socket.io-client';
import { getToken } from '../auth/api';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let socket = null;

export const connectSocket = () => {
    if (socket) return socket;
    
    const token = getToken();
    if (!token) return null;
    
    socket = io(SOCKET_URL, {
        auth: { token }
    });
    
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
