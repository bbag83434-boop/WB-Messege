import { motion } from 'framer-motion'

const conversations = [
  { name: 'Mira Jensen', initials: 'MJ', color: 'peach', message: 'The rooftop place is perfect. I booked it!', time: '10:42', unread: 2, online: true },
  { name: 'Design Circle', initials: 'DC', color: 'violet', message: 'Nia: Just dropped the new moodboard ✨', time: '09:18', unread: 0, group: true },
  { name: 'Arun Mehta', initials: 'AM', color: 'blue', message: 'Voice note · 0:24', time: 'Yesterday', unread: 0, online: true, voice: true },
  { name: 'Sofia Patel', initials: 'SP', color: 'rose', message: 'That made my day, thank you!', time: 'Yesterday', unread: 0 },
  { name: 'Weekend Plans', initials: 'WP', color: 'mint', message: 'You: I’ll bring the snacks.', time: 'Mon', unread: 0, group: true },
]

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

function AppShell() {
  return (
    <main className="app-shell" aria-label="Aster messaging home">
      <motion.section className="app-shell__stage" initial={{ opacity: 0, y: 18, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}>
        <div className="app-content">
          <header className="topbar">
            <div className="brand-mark"><span /> <strong>aster</strong></div>
            <div className="top-actions">
              <motion.button whileTap={{ scale: 0.9 }} className="icon-button" aria-label="Search"><Icon name="search" /></motion.button>
              <motion.button whileTap={{ scale: 0.9 }} className="avatar avatar--user" aria-label="Open profile">BK</motion.button>
            </div>
          </header>

          <motion.section className="welcome-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <div>
              <p className="eyebrow">MONDAY, OCTOBER 14</p>
              <h1>Good morning,<br /><span>Biswanath.</span></h1>
              <p className="welcome-copy">You have 2 new messages waiting for you.</p>
            </div>
            <div className="welcome-orb"><Icon name="wave" size={37} stroke={1.65} /></div>
          </motion.section>

          <div className="section-heading">
            <div><h2>Conversations</h2><p>Stay close to your favorite people</p></div>
            <button className="filter-button" aria-label="Conversation options"><Icon name="menu" size={19} /></button>
          </div>

          <section className="conversation-list" aria-label="Conversations">
            {conversations.map((chat, index) => (
              <motion.button className="conversation" key={chat.name} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + index * 0.075, duration: 0.32 }} whileTap={{ scale: 0.975 }}>
                <span className={`avatar avatar--chat avatar--${chat.color}`}>{chat.initials}{chat.online && <i className="online-dot" />}</span>
                <span className="chat-copy"><span className="chat-name">{chat.name}{chat.group && <em>Group</em>}</span><span className={`chat-preview ${chat.voice ? 'voice-preview' : ''}`}>{chat.voice && <Icon name="wave" size={17} />}{chat.message}</span></span>
                <span className="chat-meta"><time>{chat.time}</time>{chat.unread > 0 && <b>{chat.unread}</b>}</span>
              </motion.button>
            ))}
          </section>
        </div>

        <motion.button className="compose-button" aria-label="Start a new conversation" whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.9 }} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.65, type: 'spring', stiffness: 260, damping: 18 }}><Icon name="plus" size={25} stroke={2.4} /></motion.button>

        <nav className="bottom-nav" aria-label="Primary navigation">
          {[['chats', 'Chats'], ['contacts', 'Contacts'], ['discover', 'Discover'], ['profile', 'Profile']].map(([icon, label], index) => <motion.button key={label} whileTap={{ scale: 0.88 }} className={`nav-item ${index === 0 ? 'nav-item--active' : ''}`}><span><Icon name={icon} size={22} /></span>{label}</motion.button>)}
        </nav>
      </motion.section>
    </main>
  )
}

export default AppShell
