const fs = require('fs');
const path = require('path');
const envPath = path.resolve('.env.local');
const envBuffer = fs.readFileSync(envPath, 'utf8');
const lines = envBuffer.split('\n');
lines.forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1];
    let value = match[2];
    // Remove quotes
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
});

// Now check the database
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

(async () => {
  try {
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log('Tables in public schema:', tables.map(t => t.table_name).sort());
    // Now check each table we care about
    const requiredTables = ['agendamentos', 'barbeiros', 'clientes', 'servicos'];
    for (const table of requiredTables) {
      const exists = tables.some(t => t.table_name === table);
      console.log(`${table}: ${exists ? 'EXISTS' : 'MISSING'}`);
      if (exists) {
        // Check columns
        const columns = await sql`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${table}
          ORDER BY ordinal_position
        `;
        console.log(`  Columns for ${table}:`);
        columns.forEach(col => {
          console.log(`    ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
        });
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
})();