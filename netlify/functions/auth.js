import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getSupabaseClient } from './utils/supabase.js'

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'change-this-secret-key-in-production'
const JWT_EXPIRY = '24h'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  }
}

export const handler = async (event) => {
  const headers = corsHeaders()

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const path = event.path.replace('/.netlify/functions/auth', '')

  try {
    // Login endpoint
    if (event.httpMethod === 'POST' && path === '/login') {
      return await handleLogin(event, headers)
    }

    // Logout endpoint
    if (event.httpMethod === 'POST' && path === '/logout') {
      return await handleLogout(event, headers)
    }

    // Session check endpoint
    if (event.httpMethod === 'GET' && path === '/session') {
      return await handleSession(event, headers)
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    }
  } catch (error) {
    console.error('Auth error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}

// Handle login
async function handleLogin(event, headers) {
  try {
    const { username, password } = JSON.parse(event.body || '{}')

    if (!username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Username and password are required' })
      }
    }

    const supabase = getSupabaseClient()

    // Get user from database
    const { data: user, error } = await supabase
      .from('admin_users')
      .select('id, username, password_hash, role, active')
      .eq('username', username.toLowerCase().trim())
      .eq('active', true)
      .maybeSingle()

    if (error) {
      console.error('Database error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database error' })
      }
    }

    if (!user) {
      // Use generic message to prevent username enumeration
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid username or password' })
      }
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash)

    if (!validPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid username or password' })
      }
    }

    // Update last login
    await supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    )

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      })
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Login failed' })
    }
  }
}

// Handle logout (client-side clears token, this is for logging purposes)
async function handleLogout(event, headers) {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, message: 'Logged out successfully' })
  }
}

// Validate session token
async function handleSession(event, headers) {
  try {
    const authHeader = event.headers?.authorization || event.headers?.Authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'No token provided' })
      }
    }

    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        user: {
          id: decoded.user_id,
          username: decoded.username,
          role: decoded.role
        }
      })
    }
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid or expired token' })
      }
    }

    console.error('Session check error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Session validation failed' })
    }
  }
}

// Helper function to verify JWT token (can be imported by other functions)
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

// Helper function to check if user has required role
export function hasRole(user, requiredRole) {
  if (!user || !user.role) return false
  if (requiredRole === 'viewer') return ['viewer', 'admin'].includes(user.role)
  if (requiredRole === 'admin') return user.role === 'admin'
  return false
}
