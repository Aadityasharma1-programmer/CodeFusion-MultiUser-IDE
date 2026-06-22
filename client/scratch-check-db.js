import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  console.log('Checking tables...');
  
  // Try to query profiles
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);
  console.log('Profiles select:', pError ? pError.message : 'Success', profiles);

  // Try to query member_codes
  const { data: memberCodes, error: mcError } = await supabase
    .from('member_codes')
    .select('*')
    .limit(1);
  console.log('Member_codes select:', mcError ? mcError.message : 'Success', memberCodes);
}

check();
