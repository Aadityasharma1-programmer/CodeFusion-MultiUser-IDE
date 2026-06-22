import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testFix() {
  const email = 'fixuser' + Date.now() + '@example.com';
  const { data: authData } = await supabase.auth.signUp({
    email,
    password: 'password123',
    options: { data: { username: 'fixuser' } }
  });
  const userId = authData.user.id;
  
  // Create Project (without lang)
  const projectId = crypto.randomUUID();
  const { error: projError } = await supabase.from('projects').insert({
    id: projectId,
    name: 'Fixed Test Project',
    owner_id: userId
  });
  console.log('Project Insert:', projError ? projError.message : 'Success');

  // Insert File (without onConflict)
  const fileId = crypto.randomUUID();
  const { error: fileError } = await supabase.from('files').insert({
    project_id: projectId,
    path: '/cf-file-id/' + fileId,
    content: '// test fixed content'
  });
  console.log('File Insert:', fileError ? fileError.message : 'Success');
}

testFix();
