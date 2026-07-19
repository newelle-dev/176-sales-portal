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

// 2. Define the compiled list of stylists and their aliases
const stylists = [
  { name: 'Adda', username: 'adda', email: 'adda@example.com', wess_names: ['adda'] },
  { name: 'Agnes', username: 'agnes', email: 'agnes@example.com', wess_names: ['agnes'] },
  { name: 'Alec', username: 'alec', email: 'alec@example.com', wess_names: ['alec'] },
  { name: 'Alice', username: 'alice', email: 'alice@example.com', wess_names: ['alice', 'alice (eyelash assistant director)'] },
  { name: 'Angel', username: 'angel', email: 'angel@example.com', wess_names: ['angel assist'] },
  { name: 'Angela', username: 'angela', email: 'angela@example.com', wess_names: ['angela', 'angela (lash guru)'] },
  { name: 'Carmen', username: 'carmen', email: 'carmen@example.com', wess_names: ['carmen'] },
  { name: 'Nick', username: 'nick', email: 'nick@example.com', wess_names: ['creative director - nick'] },
  { name: 'Daisy', username: 'daisy', email: 'daisy@example.com', wess_names: ['daisy (embroidery director)'] },
  { name: 'Daniel', username: 'daniel', email: 'daniel@example.com', wess_names: ['daniel assist'] },
  { name: 'Devi', username: 'devi', email: 'devi@example.com', wess_names: ['devi'] },
  { name: 'Divya', username: 'divya', email: 'divya@example.com', wess_names: ['divya'] },
  { name: 'Ella', username: 'ella', email: 'ella@example.com', wess_names: ['ella assist'] },
  { name: 'Gino', username: 'gino', email: 'gino@example.com', wess_names: ['gino', 'gino assist'] },
  { name: 'Grace', username: 'grace', email: 'grace@example.com', wess_names: ['grace', 'grace (manicurist)'] },
  { name: 'Hellen', username: 'hellen', email: 'hellen@example.com', wess_names: ['hellen', 'hellen assist'] },
  { name: 'Jade', username: 'jade', email: 'jade@example.com', wess_names: ['jade', 'jade assist'] },
  { name: 'Jay', username: 'jay', email: 'jay@example.com', wess_names: ['jay (manicurist)', 'jay (nail guru)'] },
  { name: 'Jaymee', username: 'jaymee', email: 'jaymee@example.com', wess_names: [] },
  { name: 'Jee', username: 'jee', email: 'jee@example.com', wess_names: ['jee (nails director)'] },
  { name: 'Jessie', username: 'jessie', email: 'jessie@example.com', wess_names: ['jessie cheah (star specialist)'] },
  { name: 'Jessy', username: 'jessy', email: 'jessy@example.com', wess_names: ['jessy (manicurist)'] },
  { name: 'Jill', username: 'jill', email: 'jill@example.com', wess_names: ['jill'] },
  { name: 'Jing Wen', username: 'jingwen', email: 'jingwen@example.com', wess_names: ['jing wen (manicurist)'] },
  { name: 'Jules', username: 'jules', email: 'jules@example.com', wess_names: ['jules'] },
  { name: 'Kalpana', username: 'kalpana', email: 'kalpana@example.com', wess_names: ['kalpana'] },
  { name: 'Kelvin', username: 'kelvin', email: 'kelvin@example.com', wess_names: ['kelvin (leading stlyist)', 'kelvin (leading stylist)', 'kelvin assist'] },
  { name: 'Kenny', username: 'kenny', email: 'kenny@example.com', wess_names: ['kenny', 'kenny assist'] },
  { name: 'Management', username: 'management', email: 'management@example.com', wess_names: ['management'] },
  { name: 'Maria', username: 'maria', email: 'maria@example.com', wess_names: ['maria'] },
  { name: 'Maw Maw', username: 'mawmaw', email: 'mawmaw@example.com', wess_names: ['maw maw assist'] },
  { name: 'Mayble', username: 'mayble', email: 'mayble@example.com', wess_names: ['mayble'] },
  { name: 'Moemoe', username: 'moemoe', email: 'moemoe@example.com', wess_names: ['moemoe', 'moemoe (lash guru)'] },
  { name: 'Moon', username: 'moon', email: 'moon@example.com', wess_names: ['moon assist', 'moon asst'] },
  { name: 'Naomi', username: 'naomi', email: 'naomi@example.com', wess_names: ['naomi', 'naomi (star specialist)'] },
  { name: 'Nicholas', username: 'nicholas', email: 'nicholas@example.com', wess_names: ['nicholas', 'nicholas assist'] },
  { name: 'Nini', username: 'nini', email: 'nini@example.com', wess_names: ['nini (senior lash guru)'] },
  { name: 'Phillip', username: 'phillip', email: 'phillip@example.com', wess_names: ['phillip'] },
  { name: 'Rain', username: 'rain', email: 'rain@example.com', wess_names: ['rain assist'] },
  { name: 'Roi', username: 'roi', email: 'roi@example.com', wess_names: ['roiroi', 'roiroi (manicurist)'] },
  { name: 'Sedra', username: 'sedra', email: 'sedra@example.com', wess_names: ['sedra assist'] },
  { name: 'Sharon', username: 'sharon', email: 'sharon@example.com', wess_names: ['sharon (senior nail guru)'] },
  { name: 'Steve', username: 'steve', email: 'steve@example.com', wess_names: ['steve'] },
  { name: 'Sven', username: 'sven', email: 'sven@example.com', wess_names: ['sven', 'sven tan'] },
  { name: 'Tintin', username: 'tintin', email: 'tintin@example.com', wess_names: ['tintin'] },
  { name: 'Tyra', username: 'tyra', email: 'tyra@example.com', wess_names: ['tyra'] },
  { name: 'Wei Xin', username: 'weixin', email: 'weixin@example.com', wess_names: ['weixin assist'] },
  { name: 'William', username: 'william', email: 'william@example.com', wess_names: ['william assist'] },
  { name: 'Winnie', username: 'winnie', email: 'winnie@example.com', wess_names: ['winnie', 'winnie (lash guru)', 'winnie (lash)'] },
  { name: 'Wong Sing Yong', username: 'wongsingyong', email: 'wongsingyong@example.com', wess_names: ['wong sing yong'] },
  { name: 'Yin Voon Hao', username: 'yinvoonhao', email: 'yinvoonhao@example.com', wess_names: ['yin voon hao'] },
  { name: 'Yuri', username: 'yuri', email: 'yuri@example.com', wess_names: ['yuri assist'] },
  { name: 'YY', username: 'yy', email: 'yy@example.com', wess_names: ['yy (lash guru)'] },
  { name: 'Zom', username: 'zom', email: 'zom@example.com', wess_names: ['zom assist'] }
];

async function run() {
  console.log('Fetching all users from Supabase Auth...');
  let allAuthUsers = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: 1000,
    });

    if (error) {
      console.error('Error listing auth users:', error);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      hasMore = false;
    } else {
      allAuthUsers = allAuthUsers.concat(users);
      page++;
    }
  }

  console.log(`Found ${allAuthUsers.length} existing user(s) in Supabase Auth.`);

  for (const stylist of stylists) {
    // Attempt to find user by email prefix (e.g. adda@176avenue.com or adda@example.com)
    // or by username in metadata
    const existing = allAuthUsers.find((u) => {
      const emailPrefix = u.email.split('@')[0].toLowerCase();
      const metaUsername = (u.raw_user_meta_data && u.raw_user_meta_data.username || '').toLowerCase();
      return emailPrefix === stylist.username || metaUsername === stylist.username;
    });

    if (existing) {
      console.log(`Updating existing stylist: ${stylist.name} (ID: ${existing.id})`);
      
      const meta = existing.raw_user_meta_data || {};
      
      // 1. Update auth.users email and metadata
      const { data: updatedUser, error: authUpdateError } = await supabase.auth.admin.updateUserById(
        existing.id,
        {
          email: stylist.email,
          email_confirm: true,
          user_metadata: {
            ...meta,
            name: stylist.name,
            username: stylist.username,
            role: meta.role || 'stylist',
          },
        }
      );

      if (authUpdateError) {
        console.error(`  Error updating auth user for ${stylist.name}:`, authUpdateError.message);
        continue;
      }

      // 2. Update profiles table
      const { error: dbUpdateError } = await supabase
        .from('profiles')
        .update({
          name: stylist.name,
          email: stylist.email,
          username: stylist.username,
          wess_names: stylist.wess_names,
        })
        .eq('id', existing.id);

      if (dbUpdateError) {
        console.error(`  Error updating profile for ${stylist.name}:`, dbUpdateError.message);
      } else {
        console.log(`  Successfully updated ${stylist.name}.`);
      }

    } else {
      console.log(`Creating new stylist: ${stylist.name} (${stylist.email})`);

      // 1. Create auth user
      const { data: created, error: authCreateError } = await supabase.auth.admin.createUser({
        email: stylist.email,
        password: 'password123', // Standard default password
        user_metadata: {
          name: stylist.name,
          username: stylist.username,
          role: 'stylist',
          department: null,
        },
        email_confirm: true,
      });

      if (authCreateError) {
        console.error(`  Error creating auth user for ${stylist.name}:`, authCreateError.message);
        continue;
      }

      // 2. Update profile (since the DB trigger inserts the profile on user creation, we update it)
      if (created && created.user) {
        // Wait a tiny bit for the DB trigger to finish executing (safety buffer)
        await new Promise((resolve) => setTimeout(resolve, 300));

        const { error: dbUpdateError } = await supabase
          .from('profiles')
          .update({
            username: stylist.username,
            wess_names: stylist.wess_names,
            role: 'stylist',
          })
          .eq('id', created.user.id);

        if (dbUpdateError) {
          console.error(`  Error updating profile for ${stylist.name}:`, dbUpdateError.message);
        } else {
          console.log(`  Successfully created and updated ${stylist.name}.`);
        }
      }
    }
  }

  console.log('All stylists processed!');
}

run();
