import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { request } from '../auth/api'
import { connectSocket } from '../utils/socket'

export default function ContactsPage({ onSelectUser, onBack }) {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      try {
        const { users } = await request(`/users?search=${encodeURIComponent(search)}`)
        setUsers(users)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    const timer = setTimeout(fetchUsers, 300)
    
    const socket = connectSocket();
    socket.on('user_presence_change', (data) => {
        setOnlineUsers(prev => {
            const next = new Set(prev);
            if (data.isOnline) next.add(data.userId);
            else next.delete(data.userId);
            return next;
        });
    });
    
    return () => {
        clearTimeout(timer);
        socket.off('user_presence_change');
    }
  }, [search])

  return (
    <motion.section className="contacts-page" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <header className="topbar">
        <button className="icon-button" onClick={onBack} aria-label="Back">←</button>
        <h2>Contacts</h2>
      </header>
      
      <div className="search-box">
        <input placeholder="Search name or number" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="contacts-list">
        {loading && <p>Loading...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && users.map(user => (
          <div key={user.id} className="contact-item" onClick={() => onSelectUser(user)}>
            <div className="avatar">
                {user.profilePhoto ? <img src={user.profilePhoto} alt="" /> : user.name.slice(0,2).toUpperCase()}
                {onlineUsers.has(user.id) && <i className="online-dot" />}
            </div>
            <div className="contact-info">
              <span className="name">{user.name}</span>
              <span className="about">{user.about || 'Available'}</span>
            </div>
          </div>
        ))}
        {!loading && users.length === 0 && <p>No users found.</p>}
      </div>
    </motion.section>
  )
}
