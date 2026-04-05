import { Resend } from 'resend'

function escapeHtml (s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Notify the team when a contact form is submitted.
 * Skips silently if RESEND_API_KEY or RESEND_NOTIFY_TO is missing (same pattern as optional HubSpot).
 */
export async function sendContactFormNotification (contact) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey.includes('YOUR_')) {
    console.log('Resend not configured — skipping email notification')
    return
  }

  const toRaw = process.env.RESEND_NOTIFY_TO
  if (!toRaw || !toRaw.trim()) {
    console.warn('RESEND_NOTIFY_TO not set — skipping email notification')
    return
  }

  const to = toRaw.split(',').map((s) => s.trim()).filter(Boolean)
  const from = process.env.RESEND_FROM || 'Crypto Love You <onboarding@resend.dev>'

  const subject = `Contact form: ${contact.name}`
  const text = [
    `Name: ${contact.name}`,
    `Email: ${contact.email}`,
    `Source: ${contact.source || 'contact_page'}`,
    '',
    'Message:',
    contact.message || ''
  ].join('\n')

  const html = `
    <p><strong>Name:</strong> ${escapeHtml(contact.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(contact.email)}</p>
    <p><strong>Source:</strong> ${escapeHtml(contact.source || 'contact_page')}</p>
    <p><strong>Message:</strong></p>
    <pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(contact.message || '')}</pre>
  `

  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from,
    to,
    replyTo: contact.email,
    subject,
    text,
    html
  })

  if (error) {
    throw new Error(error.message || 'Resend send failed')
  }

  console.log('Resend notification sent:', data?.id)
}

/**
 * Auto-reply to the visitor after a successful contact submission.
 * Requires RESEND_API_KEY and RESEND_FROM. Optional RESEND_REPLY_TO (else first RESEND_NOTIFY_TO).
 * Set RESEND_AUTO_REPLY=false to disable.
 */
export async function sendContactFormAutoReply (contact) {
  if (process.env.RESEND_AUTO_REPLY === 'false') {
    console.log('Resend auto-reply disabled via RESEND_AUTO_REPLY')
    return
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey.includes('YOUR_')) {
    console.log('Resend not configured — skipping auto-reply')
    return
  }

  const from = process.env.RESEND_FROM || 'Crypto Love You <onboarding@resend.dev>'
  const replyToRaw = process.env.RESEND_REPLY_TO?.trim()
    || process.env.RESEND_NOTIFY_TO?.split(',')[0]?.trim()
  const replyTo = replyToRaw || undefined

  const subject = process.env.RESEND_AUTO_REPLY_SUBJECT?.trim()
    || 'We received your message — Crypto Love You'

  const firstName = String(contact.name || '').trim().split(/\s+/)[0] || 'there'
  const text = [
    `Hi ${firstName},`,
    '',
    'Thanks for contacting Crypto Love You. We have received your message and will get back to you as soon as we can.',
    '',
    '— Crypto Love You'
  ].join('\n')

  const html = `<p>Hi ${escapeHtml(firstName)},</p>
<p>Thanks for contacting Crypto Love You. We have received your message and will get back to you as soon as we can.</p>
<p>— Crypto Love You</p>`

  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from,
    to: contact.email,
    ...(replyTo ? { replyTo } : {}),
    subject,
    text,
    html
  })

  if (error) {
    throw new Error(error.message || 'Resend auto-reply failed')
  }

  console.log('Resend auto-reply sent:', data?.id)
}
