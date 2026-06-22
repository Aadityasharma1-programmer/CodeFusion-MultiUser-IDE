import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Use the service role key to bypass RLS!
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_omv2AIcSwlqm2YUQRdj3rw_6LjWFoP1'); 
// Wait, client/.env only has ANON key, but server/.env has SUPABASE_SERVICE_ROLE_KEY.
// Let's use the server's env file or read it.
// Let's load server/.env instead.
import fs from 'fs';
import path from 'path';

const serverEnv = fs.readFileSync('../server/.env', 'utf8');
const envMap = {};
serverEnv.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    envMap[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const serviceSupabase = createClient(envMap.SUPABASE_URL, envMap.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  console.log('Inspecting DB schema and policies...');
  
  // 1. Get policies
  const { data: policies, error: polError } = await serviceSupabase.rpc('get_policies'); // may not exist
  if (polError) {
    console.log('rpc(get_policies) failed:', polError.message);
  } else {
    console.log('Policies from RPC:', policies);
  }

  // Since we cannot run raw sql, let's check if there is an RPC we can use, 
  // or query columns of projects.
  const { data: projects, error: projError } = await serviceSupabase
    .from('projects')
    .select('*')
    .limit(5);
  
  if (projError) {
    console.error('Projects query failed:', projError.message);
  } else {
    console.log('Sample Projects:', projects);
  }

  // Let's inspect profiles
  const { data: profiles, error: profError } = await serviceSupabase
    .from('profiles')
    .select('*')
    .limit(5);
  
  if (profError) {
    console.error('Profiles query failed:', profError.message);
  } else {
    console.log('Sample Profiles:', profiles);
  }
}

test();
