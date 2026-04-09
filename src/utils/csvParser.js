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
    // For comma-delimited files, protect commas inside obvious number
    // patterns (e.g. "$378,000.00") so they aren't treated as separators.
    // Common CSV exports don't quote numeric fields — without this,
    // thousands separators would corrupt row parsing.
    const protectedLine = delimiter === ',' ? protectCommasInNumbers(line) : line;
    const values = splitCSVLine(protectedLine, delimiter).map((v) =>
      v.replace(/\u0000/g, ','),
    );
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] || '').trim();
    });
    return row;
  });
}

/**
 * Replace commas inside numeric patterns with a placeholder (NUL char)
 * so CSV splitting doesn't treat them as field separators.
 * Matches patterns like: $1,234.56 | -1,234,567.89
 *
 * The pattern requires a currency symbol so we don't accidentally
 * match adjacent integer columns like "7,2025" (month,year) as a
 * thousands-separated number. This is safer than relying on lookaheads
 * alone because grouped digits (,\d{3}) can greedily eat the first 3
 * digits of the next column.
 */
function protectCommasInNumbers(line) {
  return line.replace(
    /(?<!\d)(\$-?|-?\$)\d{1,3}(?:,\d{3})+(?:\.\d+)?(?!\d)/g,
    (match) => match.replace(/,/g, '\u0000'),
  );
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
      // Store with both original and normalized (lowercase/trimmed) keys
      // so lookups work even with casing or whitespace differences
      const trimmed = lineItem.trim();
      const entry = {
        account: account.trim(),
        subAccount: subAccount.trim(),
        expenseType: expenseType.trim(),
      };
      mapping[trimmed] = entry;
      mapping[trimmed.toLowerCase()] = entry;
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

      // Find notes column (flexible naming)
      const notesKey = headers.find((h) => /^notes?$/i.test(h.trim())) || '';

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
        notes: notesKey ? (row[notesKey] || '').trim() : '',
      };
    })
    .filter((r) => r.month > 0 && r.year > 0);
}

/**
 * Apply mapping to data rows: enrich each row with the Expense Type from the mapping.
 */
export function applyMapping(dataRows, mapping) {
  return dataRows.map((row) => {
    // Try exact match first, then case-insensitive
    const mapped = mapping[row.lineItem] || mapping[row.lineItem.toLowerCase()];
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
 * Parse a simple revenue CSV into structured rows.
 * Columns: Source/Donor, Date, Month, Year, Category, Amount (USD)
 */
export function parseRevenueCSV(text) {
  const rawRows = parseCSV(text);

  return rawRows
    .map((row) => {
      const headers = Object.keys(row);
      // Find amount column (contains "Amount" or "USD")
      const amountKey =
        headers.find((h) => h.includes('USD')) ||
        headers.find((h) => h.toLowerCase().includes('amount')) ||
        '';

      return {
        source: row['Source'] || row['Donor'] || row['Source/Donor'] || '',
        date: row['Date'] || '',
        month: parseInt(row['Month'], 10) || 0,
        year: parseInt(row['Year'], 10) || 0,
        category: (row['Category'] || row['Purpose'] || row['Type'] || 'Uncategorized').trim(),
        amountUSD: parseUSD(amountKey ? row[amountKey] : ''),
      };
    })
    .filter((r) => r.month > 0 && r.year > 0);
}

/**
 * Build dashboard-compatible revenue categories from revenue rows.
 * Groups by category, aggregates by month, auto-splits by year.
 */
export function buildRevenueCategories(currentYearRows, priorYearRows) {
  const sourceRows = currentYearRows.length > 0 ? currentYearRows : [];
  const categories = [...new Set(sourceRows.map((r) => r.category))].sort();

  return categories.map((cat) => {
    const catCurrent = currentYearRows.filter((r) => r.category === cat);
    const catPrior = priorYearRows.filter((r) => r.category === cat);

    // Find last month with actual data
    let lastActualMonth = 0;
    for (let m = 1; m <= 12; m++) {
      if (catCurrent.some((r) => r.month === m)) {
        lastActualMonth = m;
      }
    }

    const actualMonthly = [];
    const priorYearMonthly = [];

    for (let m = 1; m <= 12; m++) {
      const currentSum = catCurrent
        .filter((r) => r.month === m)
        .reduce((s, r) => s + r.amountUSD, 0);
      const priorSum = catPrior
        .filter((r) => r.month === m)
        .reduce((s, r) => s + r.amountUSD, 0);

      if (m <= lastActualMonth) {
        actualMonthly.push(currentSum);
      }
      priorYearMonthly.push(priorSum);
    }

    return {
      id: cat.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      name: cat,
      budgetAnnual: 0,
      budgetMonthly: Array(12).fill(0),
      actualMonthly,
      priorYearMonthly,
    };
  });
}

/**
 * Build dashboard-compatible category data from aggregated data.
 * Converts to the format expected by existing dashboard components.
 */
export function buildDashboardCategories(rows, budgetRows, priorYearRows) {
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Get expense types from the union of actuals AND budget so that
  // budget-only categories (no actuals yet) still appear in the dashboard
  const expenseTypes = uniqueValues([...rows, ...budgetRows, ...priorYearRows], 'expenseType');

  return expenseTypes.map((type) => {
    const typeActuals = rows.filter((r) => r.expenseType === type);
    const typeBudget = budgetRows.filter((r) => r.expenseType === type);
    const typePrior = priorYearRows.filter((r) => r.expenseType === type);

    const budgetMonthly = [];
    const priorYearMonthly = [];

    // Find the last month (1-based) that has actual data for this type
    let lastActualMonth = 0;
    for (let m = 1; m <= 12; m++) {
      if (typeActuals.some((r) => r.month === m)) {
        lastActualMonth = m;
      }
    }

    // Build positional arrays: index 0 = Jan, index 1 = Feb, etc.
    // actualMonthly is truncated at the last month with data
    const actualMonthly = [];
    const notesByMonth = {};
    for (let m = 1; m <= 12; m++) {
      const monthActuals = typeActuals.filter((r) => r.month === m);
      const actualSum = monthActuals.reduce((s, r) => s + r.amountUSD, 0);
      const budgetSum = typeBudget
        .filter((r) => r.month === m)
        .reduce((s, r) => s + r.amountUSD, 0);
      const priorSum = typePrior
        .filter((r) => r.month === m)
        .reduce((s, r) => s + r.amountUSD, 0);

      // Collect non-empty notes for this month (with their amounts and line items)
      const monthNotes = monthActuals
        .filter((r) => r.notes)
        .map((r) => ({ text: r.notes, amount: r.amountUSD, lineItem: r.lineItem || '' }));
      if (monthNotes.length > 0) {
        notesByMonth[m - 1] = monthNotes; // 0-based index
      }

      // Include actual values up to (and including) the last month with data
      if (m <= lastActualMonth) {
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
      notesByMonth,
    };
  });
}
