/**
 * Validation utilities for form inputs
 */

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} - True if valid
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Sanitize string input (prevent XSS)
 * @param {string} input - Raw input
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input) {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .substring(0, 10000) // Limit length
}

/**
 * Validate contact form data
 * @param {Object} data - Form data
 * @returns {Object} - { valid: boolean, errors: Array }
 */
export function validateContactForm(data) {
  const errors = []

  // Validate name
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters')
  }

  if (data.name && data.name.length > 100) {
    errors.push('Name is too long (max 100 characters)')
  }

  // Validate email
  if (!data.email) {
    errors.push('Email is required')
  } else if (!isValidEmail(data.email)) {
    errors.push('Invalid email format')
  }

  // Validate message
  if (!data.message || data.message.trim().length < 10) {
    errors.push('Message must be at least 10 characters')
  }

  if (data.message && data.message.length > 5000) {
    errors.push('Message is too long (max 5000 characters)')
  }

  // Check for honeypot field (spam protection)
  if (data.website || data.url || data.honeypot) {
    errors.push('Spam detected')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Simple rate limiting using in-memory store
 * In production, use Redis or similar
 */
const rateLimitStore = new Map()

export function checkRateLimit(identifier, maxRequests = 5, windowMs = 60000) {
  const now = Date.now()
  const key = identifier

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, [])
  }

  const requests = rateLimitStore.get(key)

  // Remove old requests outside the window
  const validRequests = requests.filter(timestamp => now - timestamp < windowMs)

  if (validRequests.length >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: validRequests[0] + windowMs
    }
  }

  validRequests.push(now)
  rateLimitStore.set(key, validRequests)

  return {
    allowed: true,
    remaining: maxRequests - validRequests.length,
    resetAt: now + windowMs
  }
}

/**
 * Clean up old rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now()
  const windowMs = 60000

  for (const [key, requests] of rateLimitStore.entries()) {
    const validRequests = requests.filter(timestamp => now - timestamp < windowMs)

    if (validRequests.length === 0) {
      rateLimitStore.delete(key)
    } else {
      rateLimitStore.set(key, validRequests)
    }
  }
}, 300000) // Clean up every 5 minutes
