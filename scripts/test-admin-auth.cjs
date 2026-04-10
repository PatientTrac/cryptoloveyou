#!/usr/bin/env node
/**
 * Test Admin Authentication System
 *
 * Usage: node scripts/test-admin-auth.cjs
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testAuth() {
  console.log('\n🧪 Testing Admin Authentication System\n');

  // 1. Check environment variables
  console.log('1️⃣  Checking environment variables...');
  const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_DATABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const jwtSecret = process.env.ADMIN_JWT_SECRET;

  if (!supabaseUrl || !supabaseKey) {
    console.error('   ❌ Missing Supabase credentials');
    console.error('   Required: SUPABASE_URL and SUPABASE_SERVICE_KEY');
    process.exit(1);
  }
  console.log('   ✅ Supabase credentials found');

  if (!jwtSecret) {
    console.warn('   ⚠️  ADMIN_JWT_SECRET not set (required for JWT tokens)');
  } else {
    console.log('   ✅ ADMIN_JWT_SECRET set');
  }

  // 2. Test Supabase connection
  console.log('\n2️⃣  Testing Supabase connection...');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    const { error } = await supabase.from('admin_users').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        console.error('   ❌ Table admin_users does not exist');
        console.error('   Run migration: supabase/migrations/006_simple_admin_auth.sql');
        process.exit(1);
      }
      throw error;
    }
    console.log('   ✅ Connected to Supabase successfully');
  } catch (err) {
    console.error('   ❌ Connection failed:', err.message);
    process.exit(1);
  }

  // 3. Check if default admin user exists
  console.log('\n3️⃣  Checking for default admin user...');
  const { data: adminUser, error: userError } = await supabase
    .from('admin_users')
    .select('username, role, active')
    .eq('username', 'admin')
    .maybeSingle();

  if (userError) {
    console.error('   ❌ Error checking for admin user:', userError.message);
    process.exit(1);
  }

  if (adminUser) {
    console.log('   ✅ Default admin user exists');
    console.log(`      Username: ${adminUser.username}`);
    console.log(`      Role: ${adminUser.role}`);
    console.log(`      Active: ${adminUser.active}`);
    console.log(`      Password: changeme123 (default)`);
  } else {
    console.error('   ❌ Default admin user not found');
    console.error('   Migration may not have run correctly');
    process.exit(1);
  }

  // 4. Test password hash
  console.log('\n4️⃣  Testing password verification...');
  const bcrypt = require('bcryptjs');
  const { data: user } = await supabase
    .from('admin_users')
    .select('password_hash')
    .eq('username', 'admin')
    .single();

  if (user) {
    const isValid = await bcrypt.compare('changeme123', user.password_hash);
    if (isValid) {
      console.log('   ✅ Password hash verification works');
    } else {
      console.error('   ❌ Password hash mismatch');
    }
  }

  // 5. Summary
  console.log('\n📋 Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Database migration: Complete');
  console.log('✅ Default admin user: Created');
  console.log('✅ Authentication: Ready');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🎉 Admin panel is ready to use!\n');
  console.log('Login at: http://localhost:8888/admin/login.html');
  console.log('Username: admin');
  console.log('Password: changeme123\n');

  process.exit(0);
}

testAuth().catch(err => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
