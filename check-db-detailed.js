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
    console.log('=== DATABASE SCHEMA ANALYSIS ===\n');
    
    // Check tables
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log('Tables in public schema:', tables.map(t => t.table_name).sort());
    
    // Check each required table in detail
    const requiredTables = ['agendamentos', 'barbeiros', 'clientes', 'servicos'];
    for (const table of requiredTables) {
      const exists = tables.some(t => t.table_name === table);
      console.log(`\n${table.toUpperCase()}: ${exists ? 'EXISTS' : 'MISSING'}`);
      if (exists) {
        // Check columns
        const columns = await sql`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${table}
          ORDER BY ordinal_position
        `;
        console.log(`  Columns:`);
        columns.forEach(col => {
          console.log(`    ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
        });
        
        // Check constraints
        const constraints = await sql`
          SELECT 
            tc.constraint_name, 
            tc.constraint_type,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          LEFT JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.table_schema = 'public' 
          AND tc.table_name = ${table}
        `;
        if (constraints.length > 0) {
          console.log(`  Constraints:`);
          constraints.forEach(c => {
            if (c.constraint_type === 'FOREIGN KEY') {
              console.log(`    FOREIGN KEY (${c.column_name}) REFERENCES ${c.foreign_table_name}(${c.foreign_column_name}) [${c.constraint_name}]`);
            } else {
              console.log(`    ${c.constraint_type} (${c.column_name}) [${c.constraint_name}]`);
            }
          });
        }
        
        // Check indexes
        const indexes = await sql`
          SELECT 
            indexname AS index_name,
            indexdef AS index_definition
          FROM pg_indexes
          WHERE schemaname = 'public' 
          AND tablename = ${table}
        `;
        if (indexes.length > 0) {
          console.log(`  Indexes:`);
          indexes.forEach(idx => {
            console.log(`    ${idx.index_name}: ${idx.index_definition}`);
          });
        }
      }
    }
    
    // Check for Neon auth tables (should exist but we don't care about them for our app)
    const authTables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%auth%'`;
    console.log(`\nNeon Auth Tables (informational): ${authTables.map(t => t.table_name).join(', ')}`);
    
  } catch (e) {
    console.error('Error:', e.message);
  }
})();