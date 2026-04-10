#!/usr/bin/env node
/**
 * Create Admin User Script
 *
 * This script allows you to create new admin users for the affiliate dashboard.
 *
 * Usage:
 *   node scripts/create-admin-user.cjs
 *
 * Or with arguments:
 *   node scripts/create-admin-user.cjs --username=john --password=secret123 --role=admin
 *
 * Environment variables required:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 */

require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const SALT_ROUNDS = 12;

// Parse command line arguments
const args = process.argv.slice(2);
const argsObj = {};
args.forEach(arg => {
  const [key, value] = arg.split('=');
  if (key && value) {
    argsObj[key.replace(/^--/, '')] = value;
  }
});

// Readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n=== Create Admin User ===\n');

  // Check Supabase connection
  const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_DATABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase environment variables');
    console.error('   Required: SUPABASE_URL and SUPABASE_SERVICE_KEY');
    console.error('   Check your .env file');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Test connection
  try {
    const { error } = await supabase.from('admin_users').select('id').limit(1);
    if (error && error.code === '42P01') {
      console.error('❌ Error: admin_users table does not exist');
      console.error('   Run migration: supabase/migrations/006_simple_admin_auth.sql');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }

  // Get user input
  let username = argsObj.username;
  let password = argsObj.password;
  let role = argsObj.role;

  if (!username) {
    username = await question('Username (lowercase, alphanumeric + underscore): ');
    username = username.trim().toLowerCase();
  }

  // Validate username
  if (username.length < 3) {
    console.error('❌ Username must be at least 3 characters');
    rl.close();
    process.exit(1);
  }

  if (!/^[a-z0-9_]+$/.test(username)) {
    console.error('❌ Username can only contain lowercase letters, numbers, and underscores');
    rl.close();
    process.exit(1);
  }

  // Check if username exists
  const { data: existingUser } = await supabase
    .from('admin_users')
    .select('id, username')
    .eq('username', username)
    .maybeSingle();

  if (existingUser) {
    console.error(`❌ Username "${username}" already exists`);
    rl.close();
    process.exit(1);
  }

  if (!password) {
    password = await question('Password (min 8 characters): ');
  }

  if (password.length < 8) {
    console.error('❌ Password must be at least 8 characters');
    rl.close();
    process.exit(1);
  }

  if (!role) {
    role = await question('Role (admin/viewer) [admin]: ');
    role = role.trim().toLowerCase() || 'admin';
  }

  if (!['admin', 'viewer'].includes(role)) {
    console.error('❌ Role must be either "admin" or "viewer"');
    rl.close();
    process.exit(1);
  }

  rl.close();

  // Hash password
  console.log('\n⏳ Hashing password...');
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Insert user
  console.log('⏳ Creating user...');
  const { data: newUser, error } = await supabase
    .from('admin_users')
    .insert([{
      username,
      password_hash: passwordHash,
      role,
      active: true
    }])
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to create user:', error.message);
    process.exit(1);
  }

  console.log('\n✅ User created successfully!');
  console.log(`
┌─────────────────────────────────────────┐
│ Username: ${username.padEnd(29)}│
│ Role:     ${role.padEnd(29)}│
│ Status:   active                        │
└─────────────────────────────────────────┘

🔐 Login at: ${supabaseUrl.replace(/https:\/\/([^.]+).*/, 'https://yoursite.com')}/admin/login.html

⚠️  IMPORTANT: Save this password securely!
   Password will not be shown again.
`);

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
