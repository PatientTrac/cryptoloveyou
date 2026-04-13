#!/usr/bin/env node
/**
 * Reset Admin User Password
 *
 * Usage:
 *   node scripts/reset-admin-password.cjs --username=admin --password='NewStrongPassword!' [--activate=true] [--role=admin|viewer]
 *
 * Environment variables required:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 */

require('dotenv').config()
const bcrypt = require('bcryptjs')
const { createClient } = require('@supabase/supabase-js')

const SALT_ROUNDS = 12

function parseArgs(argv) {
  const args = {}
  for (const raw of argv) {
    const [k, v] = raw.split('=')
    if (!k || v == null) continue
    args[k.replace(/^--/, '')] = v
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const username = String(args.username || '').trim().toLowerCase()
  const password = String(args.password || '')
  const activate = String(args.activate || '').toLowerCase() === 'true'
  const role = args.role ? String(args.role).trim().toLowerCase() : null

  if (!username) {
    console.error('❌ Missing --username')
    process.exit(1)
  }
  if (!password || password.length < 8) {
    console.error('❌ Missing --password (min 8 characters)')
    process.exit(1)
  }
  if (role && !['admin', 'viewer'].includes(role)) {
    console.error('❌ Invalid --role (admin|viewer)')
    process.exit(1)
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_DATABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL / SUPABASE_SERVICE_KEY in environment')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data: user, error: findErr } = await supabase
    .from('admin_users')
    .select('id, username, active, role')
    .eq('username', username)
    .maybeSingle()

  if (findErr) {
    console.error('❌ Failed to query admin_users:', findErr.message)
    process.exit(1)
  }
  if (!user) {
    console.error(`❌ No admin user found for username "${username}"`)
    process.exit(1)
  }

  console.log('⏳ Hashing password…')
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

  const patch = { password_hash: passwordHash }
  if (activate) patch.active = true
  if (role) patch.role = role

  const { error: updErr } = await supabase
    .from('admin_users')
    .update(patch)
    .eq('id', user.id)

  if (updErr) {
    console.error('❌ Failed to update password:', updErr.message)
    process.exit(1)
  }

  console.log('✅ Password updated for:', username)
  if (activate) console.log('✅ User activated')
  if (role) console.log('✅ Role set to:', role)
}

main().catch((e) => {
  console.error('❌ Error:', e?.message || e)
  process.exit(1)
})

