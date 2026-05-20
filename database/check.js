// Run: node database/check.js
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function check() {
  console.log('🔌 Connecting to Neon Tech database...\n');

  const b = await sql`SELECT COUNT(*)::int as count FROM branch`;
  const a = await sql`SELECT COUNT(*)::int as count FROM actual`;
  const bg = await sql`SELECT COUNT(*)::int as count FROM budget`;
  
  console.log('📊 Database Status:\n');
  console.log(`  branch  table: ${b[0].count} rows`);
  console.log(`  actual  table: ${a[0].count} rows`);
  console.log(`  budget  table: ${bg[0].count} rows`);

  if (b[0].count > 0) {
    const s = await sql`SELECT * FROM branch LIMIT 1`;
    console.log('\n📝 Sample branch:');
    console.log(JSON.stringify(s[0], null, 2));
  } else {
    console.log('\n✅ All tables are EMPTY!');
    console.log('📁 You can now upload your CSV files.');
  }
}

check().catch(e => { console.error('❌ Error:', e.message); });
