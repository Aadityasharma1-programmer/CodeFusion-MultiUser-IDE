import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const email = 'columnsuser' + Date.now() + '@example.com';
  const password = 'password123';
  
  await supabase.auth.signUp({ email, password, options: { data: { username: 'columns_usr' } } });
  const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
  const user = signInData.user;
  
  await new Promise(resolve => setTimeout(resolve, 2000));

  const { data, error } = await supabase.from('projects').insert({
    id: crypto.randomUUID(),
    name: 'Inspect Columns Project',
    owner_id: user.id
  }).select().single();

  if (error) {
    console.error('Insert Error:', error.message);
  } else {
    console.log('Successfully inserted! Columns of projects table are:', Object.keys(data));
  }
}

test();
