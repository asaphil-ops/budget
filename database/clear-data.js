// Run this to delete all sample data from tables (keeps the table structure)
// node database/clear-data.js

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function clearData() {
  console.log('🗑️  Deleting all sample data...\n');

  try {
    // Delete in order: budget -> actual -> branch (to respect foreign keys)
    const b1 = await sql`DELETE FROM budget`;
    console.log(`   ✅ budget table: ${b1.length} rows deleted`);

    const b2 = await sql`DELETE FROM actual`;
    console.log(`   ✅ actual table: ${b2.length} rows deleted`);

    const b3 = await sql`DELETE FROM branch`;
    console.log(`   ✅ branch table: ${b3.length} rows deleted`);

    console.log('\n✅ All sample data deleted successfully!');
    console.log('📁 You can now upload your CSV files.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearData();
