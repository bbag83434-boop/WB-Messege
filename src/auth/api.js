const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'
const TOKEN_KEY = 'my-messenger-auth-token'
const DEVICE_KEY = 'my-messenger-device-id'

export function getToken() { return localStorage.getItem(TOKEN_KEY) }
export function clearToken() { localStorage.removeItem(TOKEN_KEY) }
export function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_KEY)
  if (!deviceId) {
    deviceId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'dev-' + Math.random().toString(36).slice(2)
    localStorage.setItem(DEVICE_KEY, deviceId)
  }
  return deviceId
}

export async function request(path, options = {}, retries = 3, delay = 1000) {
  const token = getToken()
  const deviceId = getDeviceId()
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    })
    if (response.status === 204) return null
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      const error = new Error(body.message || 'Request could not be completed.')
      error.status = response.status
      throw error
    }
    return body
  } catch (error) {
    if (retries > 0 && (error.name === 'TypeError' || error.message === 'Failed to fetch')) {
      const nextDelay = Math.min(delay, 4000)
      await new Promise((resolve) => setTimeout(resolve, nextDelay))
      return request(path, options, retries - 1, nextDelay * 2)
    }
    throw error
  }
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
