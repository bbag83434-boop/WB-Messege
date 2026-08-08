import 'dotenv/config'
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pg from 'pg'
import { randomInt, randomUUID } from 'node:crypto'

const app = express()
const { Pool } = pg
const database = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false } })
const port = Number(process.env.PORT || 3001)
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
function publicUser(user) { return { id: user.id, name: user.name, mobile: user.mobile, profilePhoto: user.profilePhoto, createdAt: user.createdAt, lastSeen: user.lastSeen, isOnline: user.isOnline } }
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

app.get('/api/health', async (_req, res, next) => {
  try { await database.query('SELECT 1'); return res.json({ ok: true }) } catch (error) { return next(error) }
})

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
    const userResult = await database.query('SELECT id, name, mobile, profile_photo AS "profilePhoto", created_at AS "createdAt", last_seen AS "lastSeen", is_online AS "isOnline" FROM users WHERE mobile = $1', [mobile])
    const user = userResult.rows[0]
    if (!user) return res.json({ registrationRequired: true, verificationToken: createToken({ id: `verify:${mobile}`, mobile }, '10m', 'mobile-verification') })
    const updated = await database.query('UPDATE users SET is_online = true, last_seen = NOW() WHERE id = $1 RETURNING id, name, mobile, profile_photo AS "profilePhoto", created_at AS "createdAt", last_seen AS "lastSeen", is_online AS "isOnline"', [user.id])
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
    const result = await database.query('INSERT INTO users (id, name, mobile, profile_photo, is_online, last_seen) VALUES ($1, $2, $3, $4, true, NOW()) ON CONFLICT (mobile) DO NOTHING RETURNING id, name, mobile, profile_photo AS "profilePhoto", created_at AS "createdAt", last_seen AS "lastSeen", is_online AS "isOnline"', [randomUUID(), name, mobile, suppliedPhoto || avatarFor(name)])
    const user = result.rows[0]
    if (!user) return res.status(409).json({ message: 'An account already exists for this mobile number. Request a new OTP to sign in.' })
    return res.status(201).json({ token: createToken(user), user: publicUser(user) })
  } catch (error) { return next(error) }
})

app.get('/api/auth/me', requireAuth, async (req, res, next) => {
  try { const result = await database.query('SELECT id, name, mobile, profile_photo AS "profilePhoto", created_at AS "createdAt", last_seen AS "lastSeen", is_online AS "isOnline" FROM users WHERE id = $1', [req.auth.sub]); const user = result.rows[0]; if (!user) return res.status(401).json({ message: 'Account not found.' }); return res.json({ user: publicUser(user) }) } catch (error) { return next(error) }
})
app.post('/api/auth/logout', requireAuth, async (req, res, next) => { try { await database.query('UPDATE users SET is_online = false, last_seen = NOW() WHERE id = $1', [req.auth.sub]); return res.status(204).end() } catch (error) { return next(error) } })
app.put('/api/users/profile', requireAuth, async (req, res, next) => {
  try { const name = String(req.body.name ?? '').trim().replace(/\s+/g, ' '); const profilePhoto = typeof req.body.profilePhoto === 'string' && req.body.profilePhoto.length <= 2048 ? req.body.profilePhoto : null; if (name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Enter a name between 2 and 80 characters.' }); const result = await database.query('UPDATE users SET name = $1, profile_photo = COALESCE($2, profile_photo) WHERE id = $3 RETURNING id, name, mobile, profile_photo AS "profilePhoto", created_at AS "createdAt", last_seen AS "lastSeen", is_online AS "isOnline"', [name, profilePhoto, req.auth.sub]); return res.json({ user: publicUser(result.rows[0]) }) } catch (error) { return next(error) }
})
app.use((error, _req, res, _next) => { console.error(error); return res.status(500).json({ message: 'The server could not complete this request. Please try again.' }) })
if (!process.env.VERCEL) app.listen(port, () => console.log(`My Messenger API listening on ${port}`))
export default app
