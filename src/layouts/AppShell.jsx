import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import ProfilePage from '../pages/ProfilePage'
import ContactsPage from '../pages/ContactsPage'
import ChatPage from '../pages/ChatPage'
import { connectSocket, disconnectSocket } from '../utils/socket'
import { request } from '../auth/api'
import { useNotifications } from '../hooks/useNotifications'

const Icon = ({ name, size = 21, stroke = 1.9 }) => {
  const icons = {
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
    menu: <><path d="M5 7h14M5 12h14M5 17h14" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    chats: <><path d="M20 11.5a7.5 7.5 0 0 1-8 7.48 8.4 8.4 0 0 1-3.1-.58L4 20l1.43-4.04A7.47 7.47 0 1 1 20 11.5Z" /></>,
    contacts: <><circle cx="12" cy="8" r="3.25" /><path d="M5.5 20c.6-3.5 2.75-5.25 6.5-5.25s5.9 1.75 6.5 5.25" /></>,
    discover: <><circle cx="12" cy="12" r="8" /><path d="m15.4 8.6-2.2 4.6-4.6 2.2 2.2-4.6 4.6-2.2Z" /></>,
    profile: <><circle cx="12" cy="8" r="3.25" /><path d="M5 20c.65-3.6 2.98-5.4 7-5.4s6.35 1.8 7 5.4" /></>,
    wave: <path d="M4 13.5c2.6-4.5 4.1 4.5 6.4 0s3.8-4.5 6.1 0S20 18 21 10" />,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>
}

function AppShell({ user: initialUser, onLogout }) {
  const [user, setUser] = useState(initialUser)
  const [page, setPage] = useState('home')
  const [participant, setParticipant] = useState(null)
  const [conversations, setConversations] = useState([])
  
  useNotifications();

  useEffect(() => {
    connectSocket();
    request('/conversations').then(data => setConversations(data.conversations));
    return () => disconnectSocket();
  }, []);

  const handleLogout = () => {
    disconnectSocket();
    onLogout();
  };

  const initials = user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  if (page === 'profile') return <ProfilePage user={user} onUpdateUser={setUser} onBack={() => setPage('home')} />
  if (page === 'contacts') return <ContactsPage onSelectUser={p => { setParticipant(p); setPage('chat') }} onBack={() => setPage('home')} />
  if (page === 'chat') return <ChatPage user={user} participant={participant} onBack={() => setPage('home')} />

  return (
    <main className="app-shell" aria-label="Aster messaging home">
      <motion.section className="app-shell__stage" initial={{ opacity: 0, y: 18, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}>
        <div className="app-content">
          <header className="topbar">
            <div className="brand-mark"><span /> <strong>aster</strong></div>
            <div className="top-actions">
              <motion.button whileTap={{ scale: 0.9 }} className="icon-button" aria-label="Search"><Icon name="search" /></motion.button>
              <motion.button whileTap={{ scale: 0.9 }} className="avatar avatar--user" aria-label="Open profile" onClick={() => setPage('profile')}>{user.profilePhoto ? <img src={user.profilePhoto} alt="" /> : initials}</motion.button>
            </div>
          </header>

          <motion.section className="welcome-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <div>
              <p className="eyebrow">MONDAY, OCTOBER 14</p>
              <h1>Good morning,<br /><span>{user.name}.</span></h1>
              <p className="welcome-copy">You have new messages waiting for you.</p>
            </div>
            <div className="welcome-orb"><Icon name="wave" size={37} stroke={1.65} /></div>
          </motion.section>

          <div className="section-heading">
            <div><h2>Conversations</h2><p>Stay close to your favorite people</p></div>
            <button className="filter-button" aria-label="Conversation options"><Icon name="menu" size={19} /></button>
          </div>

          <section className="conversation-list" aria-label="Conversations">
            {conversations.map((chat, index) => (
              <motion.button className="conversation" key={chat.id} onClick={() => { setParticipant(chat.participant); setPage('chat') }} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + index * 0.075, duration: 0.32 }} whileTap={{ scale: 0.975 }}>
                <span className={`avatar avatar--chat avatar--violet`}>{chat.participant.name.slice(0,2).toUpperCase()}</span>
                <span className="chat-copy"><span className="chat-name">{chat.participant.name}</span><span className={`chat-preview`}>{chat.lastMessage}</span></span>
                <span className="chat-meta">
                    <time>{new Date(chat.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</time>
                    {chat.unreadCount > 0 && <b>{chat.unreadCount}</b>}
                </span>
              </motion.button>
            ))}
          </section>
        </div>

        <motion.button className="compose-button" aria-label="Start a new conversation" whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.9 }} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.65, type: 'spring', stiffness: 260, damping: 18 }} onClick={() => setPage('contacts')}><Icon name="plus" size={25} stroke={2.4} /></motion.button>

        <nav className="bottom-nav" aria-label="Primary navigation">
          <motion.button whileTap={{ scale: 0.88 }} className={`nav-item ${page === 'home' ? 'nav-item--active' : ''}`} onClick={() => setPage('home')}><span><Icon name="chats" size={22} /></span>Chats</motion.button>
          <motion.button whileTap={{ scale: 0.88 }} className={`nav-item ${page === 'contacts' ? 'nav-item--active' : ''}`} onClick={() => setPage('contacts')}><span><Icon name="contacts" size={22} /></span>Contacts</motion.button>
          <motion.button whileTap={{ scale: 0.88 }} className="nav-item"><span><Icon name="discover" size={22} /></span>Discover</motion.button>
          <motion.button whileTap={{ scale: 0.88 }} className="nav-item" onClick={handleLogout}><span><Icon name="profile" size={22} /></span>Logout</motion.button>
        </nav>
      </motion.section>
    </main>
  )
}

export default AppShell
