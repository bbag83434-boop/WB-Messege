import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { registerUser, sendOtp, verifyOtp } from './api'

const cleanMobile = (value) => value.replace(/\D/g, '').replace(/^91/, '').slice(0, 10)
const validMobile = (value) => /^[6-9]\d{9}$/.test(value)

export default function AuthScreen({ onAuthenticated }) {
  const [step, setStep] = useState('mobile')
  const [mobile, setMobile] = useState('')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState(Array(6).fill(''))
  const [verificationToken, setVerificationToken] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [developmentOtp, setDevelopmentOtp] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const inputs = useRef([])

  useEffect(() => { if (!seconds) return undefined; const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer) }, [seconds])
  const maskedMobile = `+91 ${mobile.slice(0, 2)}•••••${mobile.slice(-3)}`
  const send = async () => {
    setError(''); setSuccess('')
    if (!validMobile(mobile)) return setError('Enter a valid 10-digit Indian mobile number.')
    setLoading(true)
    try { const result = await sendOtp(mobile); setSeconds(result.resendAfter || 30); setDevelopmentOtp(result.developmentOtp || ''); setStep('otp'); setSuccess('A 6-digit OTP is ready to verify.'); window.setTimeout(() => inputs.current[0]?.focus(), 100) }
    catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }
  const changeOtp = (index, value) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length > 1) { const next = [...otp]; digits.slice(0, 6 - index).split('').forEach((digit, offset) => { next[index + offset] = digit }); setOtp(next); inputs.current[Math.min(5, index + digits.length)]?.focus(); return }
    const next = [...otp]; next[index] = digits; setOtp(next); if (digits && index < 5) inputs.current[index + 1]?.focus()
  }
  const verify = async (event) => {
    event.preventDefault(); setError(''); setSuccess('')
    const code = otp.join(''); if (code.length !== 6) return setError('Enter all 6 OTP digits.')
    setLoading(true)
    try { const result = await verifyOtp(mobile, code); if (result.registrationRequired) { setVerificationToken(result.verificationToken); setStep('profile'); return } setSuccess('Verified. Signing you in…'); onAuthenticated(result.user) }
    catch (requestError) { setError(requestError.message); setOtp(Array(6).fill('')); inputs.current[0]?.focus() } finally { setLoading(false) }
  }
  const register = async (event) => {
    event.preventDefault(); setError(''); if (name.trim().length < 2) return setError('Enter your name to finish creating your account.')
    setLoading(true)
    try { const user = await registerUser({ name, mobile }, verificationToken); onAuthenticated(user) } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }
  const startOver = () => { setStep('mobile'); setOtp(Array(6).fill('')); setError(''); setSuccess(''); setDevelopmentOtp('') }
  const intro = step === 'profile' ? ['Create your profile', 'What should your friends call you?', 'Your mobile number is verified. Add a name to create your account.'] : step === 'otp' ? ['Verify your number', 'Enter the 6-digit code', `We sent an OTP to ${maskedMobile}.`] : ['Welcome', 'Stay close to your people', 'Enter your Indian mobile number to continue securely.']
  return <main className="auth-page"><motion.section className="auth-card" initial={{ opacity: 0, y: 22, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .45 }}>
    <div className="auth-brand"><span className="auth-brand__icon"><i /><i /><i /></span><strong>My Messenger</strong></div>
    <div className="auth-intro"><p>{intro[0]}</p><h1>{intro[1]}</h1><span>{intro[2]}</span></div>
    {step === 'mobile' && <form onSubmit={(event) => { event.preventDefault(); send() }} noValidate><label>Mobile number<div className="mobile-field"><span>+91</span><input value={mobile} onChange={(event) => setMobile(cleanMobile(event.target.value))} inputMode="numeric" autoComplete="tel" placeholder="10-digit number" autoFocus /></div></label><Status error={error} success={success} /><button className="auth-submit" disabled={loading}>{loading ? 'Sending OTP…' : 'Send OTP'}</button></form>}
    {step === 'otp' && <form onSubmit={verify} noValidate><div className="otp-inputs" aria-label="Six digit OTP">{otp.map((value, index) => <input key={index} ref={(element) => { inputs.current[index] = element }} value={value} onChange={(event) => changeOtp(index, event.target.value)} onKeyDown={(event) => { if (event.key === 'Backspace' && !otp[index] && index) inputs.current[index - 1]?.focus() }} inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'} maxLength="6" aria-label={`OTP digit ${index + 1}`} />)}</div>{developmentOtp && <p className="auth-dev-otp">Personal mode OTP: <strong>{developmentOtp}</strong></p>}<Status error={error} success={success} /><button className="auth-submit" disabled={loading}>{loading ? 'Verifying…' : 'Verify OTP'}</button><p className="auth-switch"><button type="button" onClick={startOver}>Change mobile number</button>{seconds ? <span> · Resend in {seconds}s</span> : <button type="button" onClick={send} disabled={loading}> · Resend OTP</button>}</p></form>}
    {step === 'profile' && <form onSubmit={register} noValidate><label>Your name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength="80" placeholder="Your name" autoFocus /></label><Status error={error} success={success} /><button className="auth-submit" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button></form>}
  </motion.section></main>
}
function Status({ error, success }) { return <>{error && <p className="auth-error" role="alert">{error}</p>}{success && <p className="auth-success" role="status">{success}</p>}</> }
