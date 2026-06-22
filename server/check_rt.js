require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const res = await pool.query(`
    SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
  `);
  console.log('Realtime tables:', res.rows);
  
  // Enable realtime for chat_messages and project_members
  try {
    await pool.query(`ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages, project_members;`);
    console.log('Added tables to realtime');
  } catch(e) {
    console.log('Error adding to realtime:', e.message);
  }
  
  const res2 = await pool.query(`
    SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
  `);
  console.log('Realtime tables after:', res2.rows);

  process.exit(0);
}

run();
