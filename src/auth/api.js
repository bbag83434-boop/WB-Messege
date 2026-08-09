const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'
const TOKEN_KEY = 'my-messenger-auth-token'

export function getToken() { return localStorage.getItem(TOKEN_KEY) }
export function clearToken() { localStorage.removeItem(TOKEN_KEY) }

export async function request(path, options = {}) {
  const token = getToken()
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } })
  if (response.status === 204) return null
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || 'Request could not be completed.')
  return body
}

export function sendOtp(mobile) { return request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ mobile }) }) }
export async function verifyOtp(mobile, otp) {
  const result = await request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ mobile, otp }) })
  if (result.token) localStorage.setItem(TOKEN_KEY, result.token)
  return result
}
export async function registerUser(payload, verificationToken) {
  const result = await request('/auth/register', { method: 'POST', body: JSON.stringify(payload), headers: { Authorization: `Bearer ${verificationToken}` } })
  localStorage.setItem(TOKEN_KEY, result.token)
  return result.user
}
