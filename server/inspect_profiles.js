const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vdeofpzlmtttbrkincvt.supabase.co';
const supabaseKey = 'sb_publishable_omv2AIcSwlqm2YUQRdj3rw_6LjWFoP1'; // Anon key

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Querying member_code column...');
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, member_code')
    .limit(1);

  if (error) {
    console.error('Error (column might be missing):', error.message);
  } else {
    console.log('Success! Column exists. Profiles data:', data);
  }
}

run();
