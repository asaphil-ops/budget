// Run this script to create tables in your Neon Tech database
// node database/init.js

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function initDatabase() {
  console.log('Connecting to Neon Tech database...');
  
  try {
    // 1. Create branch table
    await sql`
      CREATE TABLE IF NOT EXISTS branch (
        branch_code VARCHAR(20) PRIMARY KEY,
        branch_name VARCHAR(200) NOT NULL,
        area VARCHAR(100),
        region VARCHAR(100),
        division VARCHAR(100),
        operation VARCHAR(100)
      );
    `;
    console.log('✅ branch table created');

    // 2. Create actual table
    await sql`
      CREATE TABLE IF NOT EXISTS actual (
        id SERIAL PRIMARY KEY,
        branch_code VARCHAR(20) NOT NULL REFERENCES branch(branch_code),
        month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
        actual DECIMAL(15,2) NOT NULL DEFAULT 0,
        account_title VARCHAR(200),
        account_code VARCHAR(20),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'rejected')),
        date DATE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('✅ actual table created');

    // 3. Create budget table
    await sql`
      CREATE TABLE IF NOT EXISTS budget (
        id SERIAL PRIMARY KEY,
        branch_code VARCHAR(20) NOT NULL REFERENCES branch(branch_code),
        month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
        budget DECIMAL(15,2) NOT NULL DEFAULT 0,
        transfer_from_cfoo DECIMAL(15,2) DEFAULT 0,
        sbar DECIMAL(15,2) DEFAULT 0,
        account_title VARCHAR(200),
        account_code VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (branch_code, month, account_title)
      );
    `;
    console.log('✅ budget table created');

    // 4. Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_actual_branch_month ON actual(branch_code, month);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_actual_status ON actual(status);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_budget_branch_month ON budget(branch_code, month);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_branch_region ON branch(region);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_branch_division ON branch(division);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_branch_area ON branch(area);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_branch_operation ON branch(operation);`;
    console.log('✅ indexes created');

    // 5. Insert sample branch data
    await sql`
      INSERT INTO branch (branch_code, branch_name, area, region, division, operation) VALUES
        ('BR-001', 'Branch A - Makati Main', 'Area 1 - North', 'NCR', 'Metro Manila', 'Operations'),
        ('BR-002', 'Branch B - Quezon City', 'Area 1 - North', 'NCR', 'Metro Manila', 'Sales'),
        ('BR-003', 'Branch C - Cebu City', 'Area 2 - South', 'Region VII', 'Visayas Operations', 'Operations'),
        ('BR-004', 'Branch D - Davao City', 'Area 3 - East', 'Region XI', 'Mindanao Operations', 'Operations'),
        ('BR-005', 'Branch E - Manila', 'Area 2 - South', 'NCR', 'Metro Manila', 'Administration')
      ON CONFLICT (branch_code) DO NOTHING;
    `;
    console.log('✅ sample branches inserted');

    // 6. Insert sample actual data
    await sql`
      INSERT INTO actual (branch_code, month, actual, account_title, account_code, status, date, description) VALUES
        ('BR-001', 1, 150000.00, 'Salaries and Wages', 'ACC-001', 'approved', '2026-01-15', 'Salaries and Wages - January 2026 - Branch A'),
        ('BR-001', 1, 25000.00, 'Office Supplies', 'ACC-002', 'approved', '2026-01-10', 'Office Supplies - January 2026 - Branch A'),
        ('BR-002', 1, 120000.00, 'Salaries and Wages', 'ACC-001', 'pending', '2026-01-15', 'Salaries and Wages - January 2026 - Branch B'),
        ('BR-003', 2, 80000.00, 'Utilities', 'ACC-004', 'approved', '2026-02-05', 'Utilities - February 2026 - Branch C'),
        ('BR-004', 2, 45000.00, 'Travel and Transportation', 'ACC-003', 'rejected', '2026-02-20', 'Travel and Transportation - February 2026 - Branch D')
      ON CONFLICT DO NOTHING;
    `;
    console.log('✅ sample actual data inserted');

    // 7. Insert sample budget data
    await sql`
      INSERT INTO budget (branch_code, month, budget, transfer_from_cfoo, sbar, account_title, account_code) VALUES
        ('BR-001', 1, 160000.00, 5000.00, 3000.00, 'Salaries and Wages', 'ACC-001'),
        ('BR-001', 1, 30000.00, 2000.00, 1000.00, 'Office Supplies', 'ACC-002'),
        ('BR-002', 1, 130000.00, 3000.00, 2000.00, 'Salaries and Wages', 'ACC-001'),
        ('BR-003', 2, 90000.00, 2500.00, 1500.00, 'Utilities', 'ACC-004'),
        ('BR-004', 2, 50000.00, 1000.00, 500.00, 'Travel and Transportation', 'ACC-003')
      ON CONFLICT (branch_code, month, account_title) DO NOTHING;
    `;
    console.log('✅ sample budget data inserted');

    // 8. Verify
    const branches = await sql`SELECT COUNT(*) as count FROM branch`;
    const actuals = await sql`SELECT COUNT(*) as count FROM actual`;
    const budgets = await sql`SELECT COUNT(*) as count FROM budget`;
    
    console.log('\n📊 Database Summary:');
    console.log(`   Branches: ${branches[0].count}`);
    console.log(`   Actual records: ${actuals[0].count}`);
    console.log(`   Budget records: ${budgets[0].count}`);
    console.log('\n✅ Database initialized successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

initDatabase();
