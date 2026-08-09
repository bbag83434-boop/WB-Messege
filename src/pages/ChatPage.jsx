import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { request } from '../auth/api'
import { connectSocket } from '../utils/socket'

export default function ChatPage({ user, participant, onBack }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [editingMessage, setEditingMessage] = useState(null)
  const [readBy, setReadBy] = useState(new Set())
  const [deliveredBy, setDeliveredBy] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const convIdRef = useRef(null)

  const fetchMessages = async (convId) => {
    try {
      const { messages } = await request(`/conversations/${convId}/messages`)
      setMessages(messages)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const getOrCreateConversation = async () => {
        try {
        const { conversationId } = await request('/conversations', { 
            method: 'POST', 
            body: JSON.stringify({ participantId: participant.id }) 
        })
        convIdRef.current = conversationId
        fetchMessages(conversationId)
        request('/messages/read', { method: 'POST', body: JSON.stringify({ conversationId }) })
        } catch (e) {
        console.error(e)
        }
    }
    getOrCreateConversation()

    const socket = connectSocket();
    socket.on('new_message', (msg) => {
        if (msg.conversationId === convIdRef.current) {
            setMessages(prev => [...prev, msg]);
            request('/messages/read', { method: 'POST', body: JSON.stringify({ conversationId: convIdRef.current }) })
            request('/messages/delivered', { method: 'POST', body: JSON.stringify({ messageId: msg.id, conversationId: convIdRef.current }) })
        }
    });
    socket.on('typing_start', (data) => {
        if (data.userId === participant.id) setIsTyping(true);
    });
    socket.on('typing_stop', (data) => {
        if (data.userId === participant.id) setIsTyping(false);
    });
    socket.on('message_read', (data) => {
        if (data.conversationId === convIdRef.current) setReadBy(prev => new Set(prev).add(data.readerId));
    });
    socket.on('message_delivered', (data) => {
        if (data.conversationId === convIdRef.current) setDeliveredBy(prev => new Set(prev).add(data.readerId));
    });
    socket.on('message_edited', (data) => {
        setMessages(prev => prev.map(m => m.id === data.messageId ? {...m, text: data.text, isEdited: data.isEdited} : m));
    });
    return () => {
        socket.off('new_message');
        socket.off('typing_start');
        socket.off('typing_stop');
        socket.off('message_read');
        socket.off('message_delivered');
        socket.off('message_edited');
    };
  }, [participant.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleTyping = (val) => {
    setText(val)
    const socket = connectSocket();
    if (val.length > 0) {
        socket.emit('typing_start', { conversationId: convIdRef.current });
    } else {
        socket.emit('typing_stop', { conversationId: convIdRef.current });
    }
  }

  const sendMessage = async () => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const socket = connectSocket();
      socket.emit('typing_stop', { conversationId: convIdRef.current });
      await request('/messages', {
        method: 'POST',
        body: JSON.stringify({ conversationId: convIdRef.current, text })
      })
      setText('')
    } catch (e) {
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  const handleEdit = async () => {
    if (!text.trim()) return;
    setSending(true)
    try {
        await request(`/messages/${editingMessage.id}`, {
            method: 'PUT',
            body: JSON.stringify({ text })
        });
        setEditingMessage(null);
        setText('');
    } catch (e) { console.error(e); }
    finally { setSending(false) }
  }

  return (
    <motion.section className="chat-page" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <header className="topbar">
        <button className="icon-button" onClick={onBack} aria-label="Back">←</button>
        <div>
            <h2>{participant.name}</h2>
            {isTyping && <p className="typing-indicator">typing...</p>}
        </div>
      </header>
      
      <div className="messages-list">
        {loading && <p>Loading...</p>}
        {messages.map(m => (
          <div key={m.id} className={`message ${m.senderId === user.id ? 'sent' : 'received'}`} onClick={() => m.senderId === user.id && setEditingMessage(m)}>
            <p>{m.text}</p>
            {m.isEdited && <small>Edited</small>}
            {m.senderId === user.id && (readBy.has(participant.id) ? <span className="read-status">Read</span> : deliveredBy.has(participant.id) && <span className="read-status">Delivered</span>)}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <textarea value={text} onChange={e => handleTyping(e.target.value)} placeholder="Type a message..." rows={1} />
        <button onClick={editingMessage ? handleEdit : sendMessage} disabled={sending}>{editingMessage ? 'Update' : 'Send'}</button>
        {editingMessage && <button onClick={() => {setEditingMessage(null); setText('')}}>Cancel</button>}
      </div>
    </motion.section>
  )
}
