/**
 * Parse CSV/TSV text into an array of objects.
 * Auto-detects tab vs comma delimiter.
 */
export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Detect delimiter: if header has tabs, use tab; otherwise comma
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter).map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line, delimiter);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] || '').trim();
    });
    return row;
  });
}

/**
 * Split a CSV line respecting quoted fields.
 */
function splitCSVLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Parse a USD amount string like "$1,459.46" or "$0.00" into a number.
 */
export function parseUSD(str) {
  if (!str || str.trim() === '') return 0;
  const cleaned = str.replace(/[^0-9.\-]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

/**
 * Parse the mapping CSV into a lookup: lineItem -> { account, subAccount, expenseType }
 */
export function parseMappingCSV(text) {
  const rows = parseCSV(text);
  const mapping = {};

  rows.forEach((row) => {
    // Find the columns — handle slight naming variations
    const lineItem = row['Line Item Account'] || row['Line Item'] || '';
    const account = row['Account'] || '';
    const subAccount = row['Sub-Account'] || row['Sub Account'] || '';
    const expenseType = row['Expense Type'] || '';

    if (lineItem) {
      mapping[lineItem.trim()] = {
        account: account.trim(),
        subAccount: subAccount.trim(),
        expenseType: expenseType.trim(),
      };
    }
  });

  return mapping;
}

/**
 * Parse the data CSV into structured rows.
 * Columns: Center Location, Date, Month, Year, Line Item, Category, Account, Sub Account, Amount (MT), Amount (USD ...)
 */
export function parseDataCSV(text) {
  const rawRows = parseCSV(text);

  return rawRows
    .map((row) => {
      const headers = Object.keys(row);
      // Find the USD amount column (contains "USD" in header)
      const usdKey = headers.find((h) => h.includes('USD')) || '';
      // Find the MT amount column (contains "MT" in header)
      const mtKey = headers.find((h) => h.includes('MT') && !h.includes('USD')) || '';

      return {
        centerLocation: row['Center Location'] || '',
        date: row['Date'] || '',
        month: parseInt(row['Month'], 10) || 0,
        year: parseInt(row['Year'], 10) || 0,
        lineItem: (row['Line Item'] || '').trim(),
        category: (row['Category'] || '').trim(),
        account: (row['Account'] || '').trim(),
        subAccount: (row['Sub Account'] || '').trim(),
        amountMT: parseUSD(mtKey ? row[mtKey] : ''),
        amountUSD: parseUSD(usdKey ? row[usdKey] : ''),
      };
    })
    .filter((r) => r.month > 0 && r.year > 0);
}

/**
 * Apply mapping to data rows: enrich each row with the Expense Type from the mapping.
 */
export function applyMapping(dataRows, mapping) {
  return dataRows.map((row) => {
    const mapped = mapping[row.lineItem];
    return {
      ...row,
      expenseType: mapped ? mapped.expenseType : row.category,
    };
  });
}

/**
 * Aggregate data rows by expenseType and month.
 * Returns: { [expenseType]: { [month]: totalUSD, total: totalUSD } }
 */
export function aggregateByTypeAndMonth(rows) {
  const result = {};

  rows.forEach((row) => {
    const type = row.expenseType || row.category || 'Uncategorized';
    if (!result[type]) result[type] = { total: 0 };
    if (!result[type][row.month]) result[type][row.month] = 0;
    result[type][row.month] += row.amountUSD;
    result[type].total += row.amountUSD;
  });

  return result;
}

/**
 * Aggregate data rows by account and month.
 */
export function aggregateByAccountAndMonth(rows) {
  const result = {};

  rows.forEach((row) => {
    const acct = row.account || 'Uncategorized';
    if (!result[acct]) result[acct] = { total: 0 };
    if (!result[acct][row.month]) result[acct][row.month] = 0;
    result[acct][row.month] += row.amountUSD;
    result[acct].total += row.amountUSD;
  });

  return result;
}

/**
 * Aggregate data rows by center location and month.
 */
export function aggregateByCenterAndMonth(rows) {
  const result = {};

  rows.forEach((row) => {
    const center = row.centerLocation || 'Unknown';
    if (!result[center]) result[center] = { total: 0 };
    if (!result[center][row.month]) result[center][row.month] = 0;
    result[center][row.month] += row.amountUSD;
    result[center].total += row.amountUSD;
  });

  return result;
}

/**
 * Get unique values for a given field.
 */
export function uniqueValues(rows, field) {
  return [...new Set(rows.map((r) => r[field]).filter(Boolean))].sort();
}

/**
 * Get the list of months that have data.
 */
export function getDataMonths(rows) {
  const months = [...new Set(rows.map((r) => r.month))].sort((a, b) => a - b);
  return months;
}

/**
 * Get the years present in the data.
 */
export function getDataYears(rows) {
  return [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
}

/**
 * Build dashboard-compatible category data from aggregated data.
 * Converts to the format expected by existing dashboard components.
 */
export function buildDashboardCategories(rows, budgetRows, priorYearRows) {
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Get expense types from actuals (or budget as fallback)
  const sourceRows = rows.length > 0 ? rows : budgetRows;
  const expenseTypes = uniqueValues(sourceRows, 'expenseType');

  return expenseTypes.map((type) => {
    const typeActuals = rows.filter((r) => r.expenseType === type);
    const typeBudget = budgetRows.filter((r) => r.expenseType === type);
    const typePrior = priorYearRows.filter((r) => r.expenseType === type);

    const actualMonthly = [];
    const budgetMonthly = [];
    const priorYearMonthly = [];

    for (let m = 1; m <= 12; m++) {
      const actualSum = typeActuals
        .filter((r) => r.month === m)
        .reduce((s, r) => s + r.amountUSD, 0);
      const budgetSum = typeBudget
        .filter((r) => r.month === m)
        .reduce((s, r) => s + r.amountUSD, 0);
      const priorSum = typePrior
        .filter((r) => r.month === m)
        .reduce((s, r) => s + r.amountUSD, 0);

      // Only include actual months that have data
      if (typeActuals.some((r) => r.month === m)) {
        actualMonthly.push(actualSum);
      }
      budgetMonthly.push(budgetSum);
      priorYearMonthly.push(priorSum);
    }

    const budgetAnnual = budgetMonthly.reduce((a, b) => a + b, 0);

    return {
      id: type.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      name: type,
      budgetAnnual,
      budgetMonthly,
      actualMonthly,
      priorYearMonthly,
    };
  });
}
