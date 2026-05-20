// Represents the actual database schema:
// branch(branch_code, branch_name, area, region, division, operation)
// actual(branch_code, month, actual)
// budget(branch_code, month, budget, transfer_from_cfoo, sbar)

export const operations = [
  'All Operations',
  'Operations', 'Finance', 'Human Resources', 'Information Technology',
  'Marketing', 'Sales', 'Administration', 'Audit', 'Legal',
  'Compliance', 'Risk Management'
];

export const divisions = [
  'All Divisions',
  'Luzon Operations', 'Visayas Operations', 'Mindanao Operations',
  'Metro Manila', 'National Capital Region', 'Provincial Operations',
  'Regional Operations Center'
];

export const regions = [
  'All Regions',
  'NCR', 'CAR', 'Region I', 'Region II', 'Region III', 'Region IV-A',
  'Region IV-B', 'Region V', 'Region VI', 'Region VII', 'Region VIII',
  'Region IX', 'Region X', 'Region XI', 'Region XII', 'CARAGA', 'BARMM'
];

export const areas = [
  'All Areas',
  'Area 1 - North', 'Area 2 - South', 'Area 3 - East', 'Area 4 - West',
  'Area 5 - Central', 'Area 6 - Urban', 'Area 7 - Rural', 'Area 8 - Coastal',
  'Area 9 - Highland'
];

export const accountTitles = [
  'All Account Titles',
  'Salaries and Wages',
  'Office Supplies',
  'Travel and Transportation',
  'Utilities',
  'Rent Expense',
  'Training and Development',
  'IT Services',
  'Marketing and Advertising',
  'Professional Fees',
  'Maintenance and Repairs',
  'Insurance Premiums',
  'Communication Expenses',
  'Fuel and Oil',
  'Food and Meals',
  'Miscellaneous Expenses',
];

export const months = [
  'All Months',
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const accountCode = [
  'ACC-001', 'ACC-002', 'ACC-003', 'ACC-004', 'ACC-005',
  'ACC-006', 'ACC-007', 'ACC-008', 'ACC-009', 'ACC-010',
  'ACC-011', 'ACC-012', 'ACC-013', 'ACC-014', 'ACC-015'
];

const statuses = ['approved', 'pending', 'rejected'];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAmount(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function generateDate(monthIdx) {
  const year = 2026;
  const day = Math.floor(Math.random() * 28) + 1;
  const month = String(monthIdx).padStart(2, '0');
  return `${year}-${month}-${String(day).padStart(2, '0')}`;
}

// Generate branch data matching the branch table schema
export function generateBranches() {
  const branchNames = [
    'Makati Main', 'Quezon City', 'Cebu City', 'Davao City', 'Manila',
    'Baguio City', 'Iloilo City', 'Cagayan de Oro', 'Laguna', 'Bulacan',
    'Pampanga', 'Batangas', 'Pangasinan', 'Zamboanga', 'Butuan'
  ];

  const branchAreas = [
    'Area 1 - North', 'Area 1 - North', 'Area 2 - South', 'Area 3 - East', 'Area 2 - South',
    'Area 1 - North', 'Area 6 - Urban', 'Area 4 - West', 'Area 2 - South', 'Area 1 - North',
    'Area 1 - North', 'Area 2 - South', 'Area 1 - North', 'Area 4 - West', 'Area 3 - East'
  ];

  const branchRegions = [
    'NCR', 'NCR', 'Region VII', 'Region XI', 'NCR',
    'CAR', 'Region VI', 'Region X', 'Region IV-A', 'Region III',
    'Region III', 'Region IV-A', 'Region I', 'Region IX', 'CARAGA'
  ];

  const branchDivisions = [
    'Metro Manila', 'Metro Manila', 'Visayas Operations', 'Mindanao Operations', 'Metro Manila',
    'Luzon Operations', 'Visayas Operations', 'Mindanao Operations', 'Luzon Operations', 'Luzon Operations',
    'Luzon Operations', 'Luzon Operations', 'Luzon Operations', 'Mindanao Operations', 'Mindanao Operations'
  ];

  const branchOps = [
    'Operations', 'Sales', 'Operations', 'Operations', 'Administration',
    'Finance', 'Operations', 'Sales', 'Marketing', 'Operations',
    'Finance', 'Sales', 'Administration', 'Operations', 'Finance'
  ];

  return branchNames.map((name, i) => ({
    branch_code: `BR-${String(i + 1).padStart(3, '0')}`,
    branch_name: `Branch ${String.fromCharCode(65 + i)} - ${name}`,
    area: branchAreas[i],
    region: branchRegions[i],
    division: branchDivisions[i],
    operation: branchOps[i],
  }));
}

export const branches = generateBranches();

export const branchOptions = [
  'All Branches',
  ...branches.map(b => b.branch_name)
];

// Generate actual and budget data matching the DB schema
// actual(branch_code, month, actual)
// budget(branch_code, month, budget, transfer_from_cfoo, sbar)
export function generateMockData() {
  const branchList = generateBranches();
  const actualRecords = [];
  const budgetRecords = [];
  const transactions = [];

  for (const branch of branchList) {
    for (let monthIdx = 1; monthIdx <= 12; monthIdx++) {
      const numEntries = 3 + Math.floor(Math.random() * 5);

      for (let e = 0; e < numEntries; e++) {
        const accountIdx = Math.floor(Math.random() * (accountTitles.length - 1)) + 1;
        const actualAmt = randomAmount(5000, 300000);
        const budgetAmt = actualAmt * (1 + (Math.random() * 0.3 - 0.05));
        const transferCfoo = randomAmount(1000, 15000);
        const sbar = randomAmount(500, 10000);
        const status = randomItem(statuses);
        const month = months[monthIdx];
        const date = generateDate(monthIdx);

        // actual table record
        actualRecords.push({
          branch_code: branch.branch_code,
          month: monthIdx,
          actual: actualAmt,
          account_title: accountTitles[accountIdx],
          account_code: accountCode[accountIdx - 1],
          status,
          date,
          description: `${accountTitles[accountIdx]} - ${month} 2026 - ${branch.branch_name}`,
        });

        // budget table record (with transfer_from_cfoo and sbar)
        budgetRecords.push({
          branch_code: branch.branch_code,
          month: monthIdx,
          budget: budgetAmt,
          transfer_from_cfoo: transferCfoo,
          sbar: sbar,
          account_title: accountTitles[accountIdx],
          account_code: accountCode[accountIdx - 1],
        });

        // Combined transaction view (JOIN of actual + budget + branch)
        transactions.push({
          id: `BE-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`,
          branch_code: branch.branch_code,
          branch_name: branch.branch_name,
          account_title: accountTitles[accountIdx],
          account_code: accountCode[accountIdx - 1],
          month,
          monthIdx,
          month_num: monthIdx,
          operation: branch.operation,
          division: branch.division,
          region: branch.region,
          area: branch.area,
          actual: actualAmt,
          budget: budgetAmt,
          transfer_from_cfoo: transferCfoo,
          sbar: sbar,
          variance: Math.round((budgetAmt - actualAmt) * 100) / 100,
          status,
          date,
          description: `${accountTitles[accountIdx]} - ${month} 2026 - ${branch.branch_name}`,
        });
      }
    }
  }

  return { transactions, actualRecords, budgetRecords, branches: branchList };
}

export const { transactions, actualRecords, budgetRecords } = generateMockData();