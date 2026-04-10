# Admin Panel Authentication System

## Overview

The admin panel now uses a secure username/password authentication system with JWT tokens and role-based access control (RBAC).

---

## Features

✅ **Username/Password Login** - Simple, secure authentication
✅ **JWT Tokens** - Industry-standard session management (24-hour expiry)
✅ **Role-Based Access Control** - Admin and Viewer roles
✅ **Bcrypt Password Hashing** - Secure password storage (12 rounds)
✅ **Session Persistence** - "Remember me" option for 24 hours
✅ **Backwards Compatible** - Old API key system still works during transition

---

## User Roles

### Admin
- ✅ View all affiliate data (clicks, aggregates, partners)
- ✅ Export CSV reports
- ✅ Mark conversions
- ✅ Create/update affiliate partners
- ✅ Activate/deactivate partners

### Viewer (Read-Only)
- ✅ View all affiliate data (clicks, aggregates, partners)
- ✅ Export CSV reports
- ❌ Cannot mark conversions
- ❌ Cannot edit affiliate partners

---

## Setup Instructions

### 1. Run Database Migration

Execute the migration in Supabase SQL Editor:

```bash
# Copy contents of:
supabase/migrations/006_simple_admin_auth.sql

# Paste into Supabase Dashboard → SQL Editor → Run
```

This creates:
- `admin_users` table
- Initial admin user (username: `admin`, password: `changeme123`)

### 2. Set Environment Variable

Add to Netlify environment variables:

```bash
ADMIN_JWT_SECRET=your-random-32-character-secret-key
```

Generate a secure key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Deploy Updated Code

```bash
git add .
git commit -m "Add username/password authentication to admin panel"
git push origin main
```

Netlify will auto-deploy the changes.

---

## Usage

### Login

1. Go to: `https://yoursite.com/admin/login.html`
2. Enter username: `admin`
3. Enter password: `changeme123`
4. Check "Remember me" for 24-hour session
5. Click Login

**First Login:** You'll be prompted to change the default password.

### Logout

Click the "Logout" button in the top-right corner of the admin dashboard.

---

## Creating New Admin Users

### Method 1: CLI Script (Recommended)

```bash
# Interactive mode
node scripts/create-admin-user.cjs

# With arguments
node scripts/create-admin-user.cjs \
  --username=john \
  --password=securepass123 \
  --role=admin
```

### Method 2: Direct SQL (Advanced)

```sql
-- Generate bcrypt hash for password first
-- Use https://bcrypt-generator.com/ with 12 rounds

INSERT INTO admin_users (username, password_hash, role, active)
VALUES (
  'newuser',
  '$2a$12$your_bcrypt_hash_here',
  'admin', -- or 'viewer'
  true
);
```

---

## Password Management

### Change Password

Currently requires SQL:

```sql
-- 1. Generate new bcrypt hash for new password
-- 2. Update user record:

UPDATE admin_users
SET password_hash = '$2a$12$new_hash_here'
WHERE username = 'admin';
```

### Reset Forgotten Password

```sql
-- Set temporary password (ask user to change after login)

UPDATE admin_users
SET password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWeCrHuG' -- "changeme123"
WHERE username = 'admin';
```

### Deactivate User

```sql
UPDATE admin_users
SET active = false
WHERE username = 'olduser';
```

---

## API Endpoints

### Login
```bash
POST /.netlify/functions/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "yourpassword"
}

# Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin"
  }
}
```

### Check Session
```bash
GET /.netlify/functions/auth/session
Authorization: Bearer your_jwt_token

# Response:
{
  "valid": true,
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin"
  }
}
```

### Logout
```bash
POST /.netlify/functions/auth/logout
Authorization: Bearer your_jwt_token

# Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Security Best Practices

### Production Checklist

- [ ] Change default admin password immediately
- [ ] Set strong `ADMIN_JWT_SECRET` (32+ random characters)
- [ ] Remove old `ADMIN_API_KEY` environment variable (after migration)
- [ ] Enable HTTPS (Netlify does this automatically)
- [ ] Review user access regularly
- [ ] Deactivate unused accounts
- [ ] Use viewer role for read-only access

### Password Requirements

- Minimum 8 characters
- Mix of letters, numbers, symbols recommended
- No dictionary words
- Unique per user

---

## Troubleshooting

### "Invalid or expired token"

**Cause:** JWT token expired (24 hours) or invalid
**Solution:** Logout and login again

### "Unauthorized - Please login"

**Cause:** No token provided or token invalid
**Solution:** Check you're logged in, try refreshing page

### "Insufficient permissions - admin role required"

**Cause:** User has viewer role but trying to edit
**Solution:** Request admin access or use read-only features

### "Database error" on login

**Cause:** Migration not run or table doesn't exist
**Solution:** Run `006_simple_admin_auth.sql` migration in Supabase

---

## Migration from API Key

### Transition Period

Both authentication methods work simultaneously:

1. **JWT tokens** (new users)
2. **API key** (legacy - for backwards compatibility)

### Removing API Key Auth

After all users migrated to username/password:

1. Remove this code block from `netlify/functions/admin-affiliate.js`:

```javascript
// BACKWARDS COMPATIBILITY: Fall back to API key if JWT not provided
// DELETE THIS BLOCK after migration complete
const apiKey = process.env.ADMIN_API_KEY
if (apiKey && String(apiKey).trim().length >= 16) {
  // ...
}
```

2. Remove `ADMIN_API_KEY` from Netlify environment variables

---

## Database Schema

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ
);
```

---

## Future Enhancements (Optional)

- Password change UI in admin panel
- Password reset via email
- Two-factor authentication (2FA)
- Audit logging (track who did what)
- User management UI (create/edit/delete users from dashboard)
- Session timeout warnings
- Password strength meter

---

## Support

For issues or questions:
1. Check this documentation
2. Review Supabase logs
3. Check Netlify function logs
4. Verify environment variables are set correctly

---

**Version:** 1.0.0
**Last Updated:** 2026-04-08
