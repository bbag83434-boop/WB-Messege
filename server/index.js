import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pg from 'pg'
import { randomInt, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { Server } from 'socket.io'

const app = express()

app.get('/api/health', async (_req, res, next) => {
  try { await database.query('SELECT 1'); return res.json({ ok: true }) } catch (error) { return next(error) }
})

const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173'
app.use(cors({ origin: allowedOrigin }))
const server = createServer(app)
const io = new Server(server, { cors: { origin: allowedOrigin } })
const { Pool } = pg
const database = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false } })
const port = Number(process.env.PORT || 3001)

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        next(new Error('Authentication error'));
    }
});

io.on('connection', (socket) => {
    socket.join(socket.user.sub);
    socket.broadcast.emit('user_presence_change', { userId: socket.user.sub, isOnline: true });

    socket.on('typing_start', (data) => {
        socket.to(data.conversationId).emit('typing_start', { userId: socket.user.sub, conversationId: data.conversationId });
    });

    socket.on('typing_stop', (data) => {
        socket.to(data.conversationId).emit('typing_stop', { userId: socket.user.sub, conversationId: data.conversationId });
    });

    socket.on('disconnect', () => {
        socket.broadcast.emit('user_presence_change', { userId: socket.user.sub, isOnline: false });
        database.query('UPDATE users SET is_online = false, last_seen = NOW() WHERE id = $1', [socket.user.sub]);
    });
});
// ...
app.get('/api/conversations', requireAuth, async (req, res, next) => {
    try {
        const result = await database.query(`
            SELECT c.id, c.updated_at AS "updatedAt",
                   p1.id AS p1_id, p1.name AS p1_name, p1.profile_photo AS p1_photo,
                   p2.id AS p2_id, p2.name AS p2_name, p2.profile_photo AS p2_photo,
                   (SELECT text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS "lastMessage",
                   (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != $1 AND read_at IS NULL) AS "unreadCount"
            FROM conversations c
            JOIN users p1 ON c.participant1_id = p1.id
            JOIN users p2 ON c.participant2_id = p2.id
            WHERE c.participant1_id = $1 OR c.participant2_id = $1
            ORDER BY c.updated_at DESC
        `, [req.auth.sub]);

        const conversations = result.rows.map(row => ({
            id: row.id,
            updatedAt: row.updatedAt,
            lastMessage: row.lastMessage,
            unreadCount: parseInt(row.unreadCount),
            participant: row.p1_id === req.auth.sub ? { id: row.p2_id, name: row.p2_name, profilePhoto: row.p2_photo } : { id: row.p1_id, name: row.p1_name, profilePhoto: row.p1_photo }
        }));

        return res.json({ conversations });
    } catch (error) { return next(error) }
})

app.post('/api/messages/delivered', requireAuth, async (req, res, next) => {
    try {
        const { messageId, conversationId } = req.body;
        await database.query('UPDATE messages SET delivered_at = NOW() WHERE id = $1 AND sender_id != $2 AND delivered_at IS NULL', [messageId, req.auth.sub]);
        io.to(conversationId).emit('message_delivered', { messageId, conversationId });
        return res.status(204).end();
    } catch (error) { return next(error) }
})
app.post('/api/messages/read', requireAuth, async (req, res, next) => {
    try {
        const { conversationId } = req.body;
        await database.query('UPDATE messages SET read_at = NOW() WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL', [conversationId, req.auth.sub]);
        io.to(conversationId).emit('message_read', { conversationId, readerId: req.auth.sub });
        return res.status(204).end();
    } catch (error) { return next(error) }
})

const isPersonalOtpMode = ['development', 'personal'].includes((process.env.AUTH_MODE || process.env.NODE_ENV || 'development').toLowerCase())
const MOBILE_PATTERN = /^[6-9]\d{9}$/
const OTP_PATTERN = /^\d{6}$/
const OTP_TTL_MINUTES = 5
const RESEND_SECONDS = 30
const MAX_OTP_REQUESTS = 5

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) console.warn('JWT_SECRET must be set to a random value of at least 32 characters before production use.')

app.disable('x-powered-by')
app.use(express.json({ limit: '200kb' }))

function normalizeMobile(value) { return String(value ?? '').replace(/\D/g, '').replace(/^91/, '') }
function publicUser(user) { return { id: user.id, name: user.name, mobile: user.mobile, profilePhoto: user.profilePhoto, about: user.about, createdAt: user.createdAt, lastSeen: user.lastSeen, isOnline: user.isOnline } }
function createToken(user, expiresIn = '30d', purpose) { return jwt.sign({ sub: user.id, mobile: user.mobile, ...(purpose ? { purpose } : {}) }, process.env.JWT_SECRET, { expiresIn }) }
function maskMobile(mobile) { return `+91 ${mobile.slice(0, 2)}•••••${mobile.slice(-3)}` }
function avatarFor(name) {
  const initials = name.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase()
  const safeInitials = initials.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character])
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="28" fill="#ef936c"/><text x="48" y="57" text-anchor="middle" font-family="Arial" font-size="34" font-weight="700" fill="#71372b">${safeInitials}</text></svg>`)}`
}
function requireAuth(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ message: 'Please sign in again.' })
  try { req.auth = jwt.verify(token, process.env.JWT_SECRET); return next() } catch { return res.status(401).json({ message: 'Your session has expired. Please sign in again.' }) }
}
function requireVerifiedMobile(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ message: 'Please verify your mobile number first.' })
  try {
    req.verification = jwt.verify(token, process.env.JWT_SECRET)
    if (req.verification.purpose !== 'mobile-verification') throw new Error('wrong token')
    return next()
  } catch { return res.status(401).json({ message: 'Your verification has expired. Request a new OTP.' }) }
}

app.post('/api/auth/send-otp', async (req, res, next) => {
  try {
    const mobile = normalizeMobile(req.body.mobile)
    if (!MOBILE_PATTERN.test(mobile)) return res.status(400).json({ message: 'Enter a valid 10-digit Indian mobile number.' })
    const recent = await database.query("SELECT created_at FROM otp_codes WHERE mobile = $1 AND created_at > NOW() - INTERVAL '15 minutes' ORDER BY created_at DESC", [mobile])
    if (recent.rowCount >= MAX_OTP_REQUESTS) return res.status(429).json({ message: 'Too many OTP requests. Please try again in 15 minutes.' })
    if (recent.rows[0] && Date.now() - new Date(recent.rows[0].created_at).getTime() < RESEND_SECONDS * 1000) return res.status(429).json({ message: `Please wait ${RESEND_SECONDS} seconds before requesting another OTP.`, retryAfter: RESEND_SECONDS })
    const otp = String(randomInt(0, 1_000_000)).padStart(6, '0')
    await database.query('UPDATE otp_codes SET used_at = NOW() WHERE mobile = $1 AND used_at IS NULL', [mobile])
    await database.query('INSERT INTO otp_codes (id, mobile, code_hash, expires_at) VALUES ($1, $2, $3, NOW() + make_interval(mins => $4::integer))', [randomUUID(), mobile, await bcrypt.hash(otp, 12), OTP_TTL_MINUTES])
    const exists = await database.query('SELECT 1 FROM users WHERE mobile = $1', [mobile])
    return res.json({ message: 'OTP created.', mobile: maskMobile(mobile), expiresIn: OTP_TTL_MINUTES * 60, resendAfter: RESEND_SECONDS, registered: Boolean(exists.rowCount), ...(isPersonalOtpMode ? { developmentOtp: otp } : {}) })
  } catch (error) { return next(error) }
})

app.post('/api/auth/verify-otp', async (req, res, next) => {
  try {
    const mobile = normalizeMobile(req.body.mobile)
    const otp = String(req.body.otp ?? '')
    if (!MOBILE_PATTERN.test(mobile) || !OTP_PATTERN.test(otp)) return res.status(400).json({ message: 'Enter your mobile number and 6-digit OTP.' })
    const result = await database.query('SELECT id, code_hash AS "codeHash", expires_at AS "expiresAt" FROM otp_codes WHERE mobile = $1 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1', [mobile])
    const record = result.rows[0]
    if (!record || new Date(record.expiresAt) <= new Date() || !(await bcrypt.compare(otp, record.codeHash))) return res.status(401).json({ message: 'That OTP is invalid or has expired.' })
    await database.query('UPDATE otp_codes SET used_at = NOW() WHERE id = $1 AND used_at IS NULL', [record.id])
    const userResult = await database.query('SELECT id, name, mobile, profile_photo AS "profilePhoto", about, created_at AS "createdAt", last_seen AS "lastSeen", is_online AS "isOnline" FROM users WHERE mobile = $1', [mobile])
    const user = userResult.rows[0]
    if (!user) return res.json({ registrationRequired: true, verificationToken: createToken({ id: `verify:${mobile}`, mobile }, '10m', 'mobile-verification') })
    const updated = await database.query('UPDATE users SET is_online = true, last_seen = NOW() WHERE id = $1 RETURNING id, name, mobile, profile_photo AS "profilePhoto", about, created_at AS "createdAt", last_seen AS "lastSeen", is_online AS "isOnline"', [user.id])
    const authenticatedUser = updated.rows[0]
    return res.json({ token: createToken(authenticatedUser), user: publicUser(authenticatedUser) })
  } catch (error) { return next(error) }
})

app.post('/api/auth/register', requireVerifiedMobile, async (req, res, next) => {
  try {
    const name = String(req.body.name ?? '').trim().replace(/\s+/g, ' ')
    const mobile = normalizeMobile(req.body.mobile)
    const verifiedMobile = req.verification.mobile
    const suppliedPhoto = typeof req.body.profilePhoto === 'string' && req.body.profilePhoto.length <= 2048 ? req.body.profilePhoto : null
    if (mobile !== verifiedMobile || !MOBILE_PATTERN.test(mobile)) return res.status(400).json({ message: 'Register using the mobile number you verified.' })
    if (name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Enter a name between 2 and 80 characters.' })
    const result = await database.query('INSERT INTO users (id, name, mobile, profile_photo, is_online, last_seen) VALUES ($1, $2, $3, $4, true, NOW()) ON CONFLICT (mobile) DO NOTHING RETURNING id, name, mobile, profile_photo AS "profilePhoto", about, created_at AS "createdAt", last_seen AS "lastSeen", is_online AS "isOnline"', [randomUUID(), name, mobile, suppliedPhoto || avatarFor(name)])
    const user = result.rows[0]
    if (!user) return res.status(409).json({ message: 'An account already exists for this mobile number. Request a new OTP to sign in.' })
    return res.status(201).json({ token: createToken(user), user: publicUser(user) })
  } catch (error) { return next(error) }
})

app.get('/api/auth/me', requireAuth, async (req, res, next) => {
  try { const result = await database.query('SELECT id, name, mobile, profile_photo AS "profilePhoto", about, created_at AS "createdAt", last_seen AS "lastSeen", is_online AS "isOnline" FROM users WHERE id = $1', [req.auth.sub]); const user = result.rows[0]; if (!user) return res.status(401).json({ message: 'Account not found.' }); return res.json({ user: publicUser(user) }) } catch (error) { return next(error) }
})
app.post('/api/auth/logout', requireAuth, async (req, res, next) => { try { await database.query('UPDATE users SET is_online = false, last_seen = NOW() WHERE id = $1', [req.auth.sub]); return res.status(204).end() } catch (error) { return next(error) } })
app.put('/api/users/profile', requireAuth, async (req, res, next) => {
  try { const name = String(req.body.name ?? '').trim().replace(/\s+/g, ' '); const profilePhoto = typeof req.body.profilePhoto === 'string' && req.body.profilePhoto.length <= 2048 ? req.body.profilePhoto : null; const about = String(req.body.about ?? '').slice(0, 160); if (name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Enter a name between 2 and 80 characters.' }); const result = await database.query('UPDATE users SET name = $1, profile_photo = COALESCE($2, profile_photo), about = $3 WHERE id = $4 RETURNING id, name, mobile, profile_photo AS "profilePhoto", about, created_at AS "createdAt", last_seen AS "lastSeen", is_online AS "isOnline"', [name, profilePhoto, about, req.auth.sub]); console.log('Update Result:', result.rows[0]); return res.json({ user: publicUser(result.rows[0]) }) } catch (error) { return next(error) }
})

app.get('/api/users', requireAuth, async (req, res, next) => {
  try {
    const searchTerm = req.query.search ? `%${req.query.search}%` : '%';
    const result = await database.query(
      'SELECT id, name, mobile, profile_photo AS "profilePhoto", about, created_at AS "createdAt", last_seen AS "lastSeen", is_online AS "isOnline" FROM users WHERE id != $1 AND (name ILIKE $2 OR mobile ILIKE $2) ORDER BY name ASC',
      [req.auth.sub, searchTerm]
    );
    return res.json({ users: result.rows.map(publicUser) });
  } catch (error) { return next(error) }
})

app.post('/api/conversations', requireAuth, async (req, res, next) => {
  try {
    const { participantId } = req.body;
    if (!participantId || participantId === req.auth.sub) return res.status(400).json({ message: 'Invalid participant.' });
    
    const p1 = req.auth.sub < participantId ? req.auth.sub : participantId;
    const p2 = req.auth.sub < participantId ? participantId : req.auth.sub;
    
    let result = await database.query('SELECT id FROM conversations WHERE participant1_id = $1 AND participant2_id = $2', [p1, p2]);
    let convId = result.rows[0]?.id;
    
    if (!convId) {
        convId = randomUUID();
        await database.query('INSERT INTO conversations (id, participant1_id, participant2_id) VALUES ($1, $2, $3)', [convId, p1, p2]);
    }
    return res.json({ conversationId: convId });
  } catch (error) { return next(error) }
})

app.post('/api/messages', requireAuth, async (req, res, next) => {
    try {
        const { conversationId, text } = req.body;
        if (!conversationId || !text) return res.status(400).json({ message: 'Invalid data.' });
        
        const conv = await database.query('SELECT participant1_id, participant2_id FROM conversations WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $2)', [conversationId, req.auth.sub]);
        if (conv.rowCount === 0) return res.status(403).json({ message: 'Not a participant.' });
        
        const messageId = randomUUID();
        await database.query('INSERT INTO messages (id, conversation_id, sender_id, text) VALUES ($1, $2, $3, $4)', [messageId, conversationId, req.auth.sub, text]);
        await database.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);
        
        const message = { id: messageId, conversationId, senderId: req.auth.sub, text, createdAt: new Date() };
        const participant = conv.rows[0].participant1_id === req.auth.sub ? conv.rows[0].participant2_id : conv.rows[0].participant1_id;
        io.to(participant).emit('new_message', message);
        
        return res.status(201).json({ id: messageId });
    } catch (error) { return next(error) }
})

app.put('/api/messages/:messageId', requireAuth, async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const { text } = req.body;
        if (!text || text.trim().length === 0) return res.status(400).json({ message: 'Message cannot be empty.' });

        const result = await database.query(
            'UPDATE messages SET text = $1, is_edited = TRUE WHERE id = $2 AND sender_id = $3 RETURNING conversation_id',
            [text, messageId, req.auth.sub]
        );

        if (result.rowCount === 0) return res.status(403).json({ message: 'Unauthorized or message not found.' });

        const conversationId = result.rows[0].conversation_id;
        io.to(conversationId).emit('message_edited', { messageId, text, isEdited: true });
        return res.status(204).end();
        } catch (error) { return next(error) }
        })

        app.delete('/api/messages/:messageId', requireAuth, async (req, res, next) => {
        try {
        const { messageId } = req.params;

        const result = await database.query(
            'UPDATE messages SET is_deleted = TRUE, text = \'Message deleted\' WHERE id = $1 AND sender_id = $2 RETURNING conversation_id',
            [messageId, req.auth.sub]
        );

        if (result.rowCount === 0) return res.status(403).json({ message: 'Unauthorized or message not found.' });

        const conversationId = result.rows[0].conversation_id;
        io.to(conversationId).emit('message_deleted', { messageId });

        return res.status(204).end();
        } catch (error) { return next(error) }
        })

        app.get('/api/conversations/:conversationId/messages', requireAuth, async (req, res, next) => {
        try {
        // ...

        const { conversationId } = req.params;
        const conv = await database.query('SELECT participant1_id, participant2_id FROM conversations WHERE id = $1 AND (participant1_id = $2 OR participant2_id = $2)', [conversationId, req.auth.sub]);
        if (conv.rowCount === 0) return res.status(403).json({ message: 'Not a participant.' });
        
        const messages = await database.query('SELECT id, conversation_id AS "conversationId", sender_id AS "senderId", text, created_at AS "createdAt" FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC', [conversationId]);
        return res.json({ messages: messages.rows });
    } catch (error) { return next(error) }
})

app.use((error, _req, res, _next) => { console.error(error); return res.status(500).json({ message: 'The server could not complete this request. Please try again.' }) })
if (!process.env.VERCEL) server.listen(port, '0.0.0.0', () => console.log(`My Messenger API listening on ${port}`))
export default app
