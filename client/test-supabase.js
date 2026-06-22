import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log('Testing Supabase project & file creation...');
  
  // 1. Authenticate (login with existing user from DB or generic test)
  // Let's just create a dummy email user if we don't know the user, or we can use the service role key?
  // We only have ANON key. Let's sign up a test user to bypass auth issues in script.
  const email = 'testuser' + Date.now() + '@example.com';
  console.log('Signing up user:', email);
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'password123',
    options: { data: { username: 'testuser' } }
  });
  if (authError) {
    console.error('Auth Error:', authError.message);
    return;
  }
  const userId = authData.user.id;
  console.log('User ID:', userId);

  // 2. Create project
  const projectId = crypto.randomUUID();
  console.log('Creating project ID:', projectId);
  const { data: projData, error: projError } = await supabase.from('projects').insert({
    id: projectId,
    name: 'Test Project',
    lang: 'javascript',
    owner_id: userId
  }).select().single();
  
  if (projError) {
    console.error('Project Create Error:', projError.message);
  } else {
    console.log('Project created successfully!');
  }

  // 3. Upsert file
  const fileId = crypto.randomUUID();
  console.log('Upserting file:', fileId);
  const { data: fileData, error: fileError } = await supabase.from('files').upsert({
    project_id: projectId,
    path: '/cf-file-id/' + fileId,
    content: '// test'
  }, { onConflict: 'project_id,path' }).select().single();

  if (fileError) {
    console.error('File Upsert Error:', fileError.message);
  } else {
    console.log('File upserted successfully!');
  }
}

test();
