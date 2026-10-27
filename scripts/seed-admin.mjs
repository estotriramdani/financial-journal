import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

// Load .env.local if present
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...vals] = trimmed.split('=');
      if (key && vals.length > 0) {
        process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  }
} catch (e) {
  // Ignore env read error
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ktkwhcirapliwlthofvw.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is required in environment or .env.local');
  process.exit(1);
}

const adminEmail = process.env.ADMIN_EMAIL || 'admin@financialjournal.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!@#';
const adminName = 'Administrator';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seedAdmin() {
  console.log(`Seeding admin account: ${adminEmail}...`);

  // Check if user already exists
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError);
    process.exit(1);
  }

  let adminUser = usersData.users.find((u) => u.email === adminEmail);

  if (!adminUser) {
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { name: adminName },
      app_metadata: { role: 'admin' },
    });

    if (createError) {
      console.error('Error creating admin user:', createError);
      process.exit(1);
    }
    adminUser = newUser.user;
    console.log('Admin user created successfully with ID:', adminUser.id);
  } else {
    // Update existing user's password and metadata
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      {
        password: adminPassword,
        email_confirm: true,
        user_metadata: { name: adminName },
        app_metadata: { role: 'admin' },
      }
    );

    if (updateError) {
      console.error('Error updating admin user:', updateError);
      process.exit(1);
    }
    adminUser = updatedUser.user;
    console.log('Admin user updated successfully with ID:', adminUser.id);
  }

  // Ensure profiles table has admin role
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: adminUser.id,
      name: adminName,
      email: adminEmail,
      role: 'admin',
      updated_at: new Date().toISOString(),
    });

  if (profileError) {
    console.error('Error updating profiles table for admin:', profileError);
    process.exit(1);
  }

  console.log('--- ADMIN SEED COMPLETE ---');
  console.log(`Email   : ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log(`Role    : admin`);
}

seedAdmin();
