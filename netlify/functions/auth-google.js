import jwt from 'jsonwebtoken'
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'change-this-secret-key-in-production'
const ALLOWED_EMAILS = (process.env.GOOGLE_ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
const REDIRECT_URI = 'https://cryptoloveyou.com/api/auth/google/callback'
const ADMIN_URL = 'https://cryptoloveyou.com/admin/'
const LOGIN_URL = 'https://cryptoloveyou.com/admin/login.html'
export const handler = async (event) => {
  const path = event.path || ''
  const qs = event.queryStringParameters || {}
  if (!path.includes('/callback')) {
    if (!CLIENT_ID) return { statusCode: 500, body: 'Google OAuth not configured' }
    const params = new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, response_type: 'code', scope: 'openid email profile', access_type: 'online', prompt: 'select_account' })
    return { statusCode: 302, headers: { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }, body: '' }
  }
  const code = qs.code
  if (!code) return { statusCode: 302, headers: { Location: `${LOGIN_URL}?error=no_code` }, body: '' }
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: REDIRECT_URI, grant_type: 'authorization_code' }) })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new Error('No access token')
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tokenData.access_token}` } })
    const googleUser = await userRes.json()
    const email = (googleUser.email || '').toLowerCase()
    if (!email) throw new Error('No email from Google')
    if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(email)) return { statusCode: 302, headers: { Location: `${LOGIN_URL}?error=not_authorized` }, body: '' }
    const token = jwt.sign({ user_id: `google_${googleUser.id}`, username: email, role: 'admin', provider: 'google' }, JWT_SECRET, { expiresIn: '24h' })
    return { statusCode: 302, headers: { Location: `${ADMIN_URL}?google_token=${encodeURIComponent(token)}`, 'Set-Cookie': `admin_token=${token}; Path=/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=86400` }, body: '' }
  } catch (err) {
    return { statusCode: 302, headers: { Location: `${LOGIN_URL}?error=oauth_failed` }, body: '' }
  }
}
