import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
console.log('TABLES:', tables.map(t => t.table_name).join(', '));

for (const { table_name } of tables) {
  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = ${table_name} ORDER BY ordinal_position`;
  console.log(`\n${table_name.toUpperCase()} COLUMNS:`);
  cols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
}
