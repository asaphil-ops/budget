import { mkdirSync, readFileSync, writeFileSync } from 'fs';

const monthMap = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function parseCSVLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCSV(path) {
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.trim().split(/\r?\n/);
  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());

  return lines.slice(1).filter(Boolean).map((line) => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });
}

function monthNumber(value) {
  const num = Number(value);
  if (Number.isFinite(num) && num >= 1 && num <= 12) return num;
  return monthMap[String(value || '').trim().toLowerCase()] || 1;
}

function amount(value) {
  return Number(String(value || '0').replace(/,/g, '')) || 0;
}

function moneyRows(rows, type) {
  return rows.map((row) => {
    if (type === 'actual') {
      return [row.branch_code, monthNumber(row.month), row.account_title, amount(row.actual)];
    }

    return [
      row.branch_code,
      monthNumber(row.month),
      row.account_title,
      amount(row.budget),
      amount(row.transfer_from_cfoo),
      amount(row.sbar),
    ];
  });
}

const data = {
  branches: parseCSV('database/branch.csv').map((row) => [
    row.branch_code,
    row.branch_name,
    row.area,
    row.region,
    row.division,
    row.operation,
  ]),
  actual: moneyRows(parseCSV('database/actual.csv'), 'actual'),
  budget: moneyRows(parseCSV('database/budget.csv'), 'budget'),
  revenueActual: moneyRows(parseCSV('database/revenue._actual.csv'), 'actual'),
  revenueBudget: moneyRows(parseCSV('database/revenue_budget.csv'), 'budget'),
};

mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/static-data.json', JSON.stringify(data));

console.log('Generated public/data/static-data.json');
