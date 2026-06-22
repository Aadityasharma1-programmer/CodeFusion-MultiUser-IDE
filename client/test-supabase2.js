import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
  // Try to insert a file without ON CONFLICT to see if it works
  const { data, error } = await supabase.from('files').insert({
    project_id: '12345678-1234-1234-1234-123456789012', // dummy
    path: '/cf-file-id/dummy',
    content: '// test'
  }).select();
  
  console.log('Insert without onConflict:', error ? error.message : 'Success');
}
checkSchema();
