const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Load environment variables manually
const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('.env file not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key] = value.trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function run() {
  const adminEmail = 'admin@example.com';
  const adminUsername = 'admin176';
  const adminName = 'Admin';
  const adminPassword = 'password123';
  const adminRole = 'admin';

  console.log(`Checking if user ${adminEmail} or username ${adminUsername} exists...`);
  
  // Check auth.users
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError);
    process.exit(1);
  }

  const existing = users.find((u) => {
    const emailMatch = u.email.toLowerCase() === adminEmail.toLowerCase();
    const metaUsername = (u.raw_user_meta_data && u.raw_user_meta_data.username || '').toLowerCase();
    return emailMatch || metaUsername === adminUsername.toLowerCase();
  });

  if (existing) {
    console.log(`User already exists (ID: ${existing.id}). Updating to request parameters...`);
    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(
      existing.id,
      {
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          ...existing.raw_user_meta_data,
          name: adminName,
          username: adminUsername,
          role: adminRole,
        },
      }
    );

    if (updateError) {
      console.error('Error updating existing admin user:', updateError.message);
      process.exit(1);
    }

    const { error: dbUpdateError } = await supabase
      .from('profiles')
      .update({
        name: adminName,
        email: adminEmail,
        username: adminUsername,
        role: adminRole,
      })
      .eq('id', existing.id);

    if (dbUpdateError) {
      console.error('Error updating profile in database:', dbUpdateError.message);
      process.exit(1);
    }

    console.log('Successfully updated existing admin account!');
  } else {
    console.log('Creating new admin user...');
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      user_metadata: {
        name: adminName,
        username: adminUsername,
        role: adminRole,
        department: null,
      },
      email_confirm: true,
    });

    if (createError) {
      console.error('Error creating admin user:', createError.message);
      process.exit(1);
    }

    if (created && created.user) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { error: dbUpdateError } = await supabase
        .from('profiles')
        .update({
          username: adminUsername,
          role: adminRole,
        })
        .eq('id', created.user.id);

      if (dbUpdateError) {
        console.error('Error updating profile in database:', dbUpdateError.message);
        process.exit(1);
      }

      console.log('Successfully created admin account!');
    }
  }
}

run();
