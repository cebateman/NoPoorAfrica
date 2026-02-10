import { CURRENT_MONTH_INDEX } from '../data/financialData';

// Allow overriding the current month index for uploaded data
let _overrideMonthIndex = null;

export function setCurrentMonthIndex(idx) {
  _overrideMonthIndex = idx;
}

export function getCurrentMonthIndex() {
  return _overrideMonthIndex !== null ? _overrideMonthIndex : CURRENT_MONTH_INDEX;
}

/**
 * Sum array values up to (and including) a given month index.
 */
export function sumToMonth(arr, monthIndex) {
  const idx = monthIndex !== undefined ? monthIndex : getCurrentMonthIndex();
  return arr.slice(0, idx + 1).reduce((a, b) => a + b, 0);
}

/**
 * Sum an entire array.
 */
export function sumAll(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

/**
 * Calculate YTD totals for a list of categories.
 */
export function ytdTotal(categories, field = 'actualMonthly', monthIndex) {
  // For actuals, use length of actualMonthly as the upper bound
  return categories.reduce((sum, cat) => {
    const arr = cat[field] || [];
    const idx = monthIndex !== undefined ? monthIndex : (arr.length > 0 ? arr.length - 1 : getCurrentMonthIndex());
    return sum + sumToMonth(arr, idx);
  }, 0);
}

/**
 * Calculate YTD budget total, using the same number of months as actuals.
 */
export function ytdBudgetTotal(categories, monthIndex) {
  return categories.reduce((sum, cat) => {
    const actualLen = cat.actualMonthly ? cat.actualMonthly.length : 0;
    const idx = monthIndex !== undefined ? monthIndex : (actualLen > 0 ? actualLen - 1 : getCurrentMonthIndex());
    return sum + sumToMonth(cat.budgetMonthly, idx);
  }, 0);
}

/**
 * Calculate prior year YTD total.
 */
export function ytdPriorYearTotal(categories, monthIndex) {
  return categories.reduce((sum, cat) => {
    const actualLen = cat.actualMonthly ? cat.actualMonthly.length : 0;
    const idx = monthIndex !== undefined ? monthIndex : (actualLen > 0 ? actualLen - 1 : getCurrentMonthIndex());
    return sum + sumToMonth(cat.priorYearMonthly, idx);
  }, 0);
}

/**
 * Full prior year total.
 */
export function fullYearPriorTotal(categories) {
  return categories.reduce((sum, cat) => sum + sumAll(cat.priorYearMonthly), 0);
}

/**
 * Full year budget total.
 */
export function fullYearBudgetTotal(categories) {
  return categories.reduce((sum, cat) => sum + cat.budgetAnnual, 0);
}

/**
 * Variance (actual - budget).
 */
export function variance(actual, budget) {
  return actual - budget;
}

/**
 * Variance percentage.
 */
export function variancePct(actual, budget) {
  if (budget === 0) return 0;
  return ((actual - budget) / budget) * 100;
}

/**
 * Format a number as USD currency.
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a percentage.
 */
export function formatPct(value) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Build monthly comparison data for charts.
 * options.actualsYear  — year of actuals data (for labels)
 * options.budgetYear   — year of budget data; if ≠ actualsYear → budget = 0
 * options.priorYear    — year of prior data (for labels)
 */
export function buildMonthlyComparison(categories, months, options = {}) {
  const { actualsYear, budgetYear, priorYear: priorYr } = options;
  const budgetMatchesActuals = !actualsYear || !budgetYear || budgetYear === actualsYear;

  // Determine max month with actual data
  const maxActualMonth = categories.reduce((max, cat) => {
    return Math.max(max, (cat.actualMonthly || []).length - 1);
  }, -1);

  // Short year label like "'25"
  const fmtYear = (y) => (y ? ` '${String(y).slice(-2)}` : '');

  return months.map((month, i) => {
    const budget = budgetMatchesActuals
      ? categories.reduce((sum, cat) => sum + (cat.budgetMonthly[i] || 0), 0)
      : 0;
    const actual =
      i <= maxActualMonth
        ? categories.reduce(
            (sum, cat) => sum + ((cat.actualMonthly || [])[i] || 0),
            0,
          )
        : null;
    const prior = categories.reduce(
      (sum, cat) => sum + ((cat.priorYearMonthly || [])[i] || 0),
      0,
    );

    // Label: "Jan '25" when year is known, otherwise just "Jan"
    const label = actualsYear ? `${month}${fmtYear(actualsYear)}` : month;

    return { month: label, budget, actual, priorYear: prior };
  });
}

/**
 * Build a continuous timeline spanning prior year actuals → current year actuals → forward budget.
 * Returns one data point per month across all relevant years.
 *
 * options.actualsYear  — year of current actuals
 * options.priorYear    — year of prior actuals
 * options.budgetYear   — year of budget data
 */
export function buildTimelineData(categories, months, options = {}) {
  const { actualsYear, budgetYear, priorYear } = options;

  // Collect all years we have data for
  const years = new Set();
  if (priorYear) years.add(priorYear);
  if (actualsYear) years.add(actualsYear);
  if (budgetYear) years.add(budgetYear);
  if (years.size === 0) return [];

  const sortedYears = [...years].sort((a, b) => a - b);
  const startYear = sortedYears[0];
  const endYear = sortedYears[sortedYears.length - 1];

  // Max month with actual data in current year
  const maxActualMonth = categories.reduce((max, cat) => {
    return Math.max(max, (cat.actualMonthly || []).length - 1);
  }, -1);

  const data = [];
  for (let y = startYear; y <= endYear; y++) {
    for (let m = 0; m < 12; m++) {
      const label = `${months[m]} '${String(y).slice(-2)}`;

      let actual = null;
      let budget = null;

      // Current year actuals
      if (y === actualsYear && m <= maxActualMonth) {
        actual = categories.reduce(
          (sum, cat) => sum + ((cat.actualMonthly || [])[m] || 0), 0,
        );
      }
      // Prior year actuals
      if (y === priorYear) {
        actual = categories.reduce(
          (sum, cat) => sum + ((cat.priorYearMonthly || [])[m] || 0), 0,
        );
      }

      // Budget (show for the budget year)
      if (y === budgetYear) {
        budget = categories.reduce(
          (sum, cat) => sum + ((cat.budgetMonthly || [])[m] || 0), 0,
        );
      }

      data.push({ month: label, actual, budget, year: y, monthIndex: m });
    }
  }

  return data;
}

/**
 * Get a single month's total across categories.
 * monthIdx is 0-based (0 = Jan).
 */
export function monthTotal(categories, field, monthIdx) {
  return categories.reduce((sum, cat) => {
    const arr = cat[field] || [];
    return sum + (arr[monthIdx] || 0);
  }, 0);
}

/**
 * Build per-category monthly detail rows for a single month.
 * Returns one row per category with actual, budget, prior for that month.
 */
export function buildMonthlyCategoryDetail(categories, monthIdx) {
  return categories.map((cat) => {
    const actual = (cat.actualMonthly || [])[monthIdx] || 0;
    const budget = (cat.budgetMonthly || [])[monthIdx] || 0;
    const prior = (cat.priorYearMonthly || [])[monthIdx] || 0;
    const hasActual = monthIdx < (cat.actualMonthly || []).length;

    return {
      id: cat.id,
      name: cat.name,
      location: cat.location,
      actual: hasActual ? actual : null,
      budget,
      prior,
      budgetVar: hasActual ? actual - budget : null,
      budgetVarPct: hasActual && budget !== 0 ? ((actual - budget) / budget) * 100 : null,
      priorVar: hasActual ? actual - prior : null,
      priorVarPct: hasActual && prior !== 0 ? ((actual - prior) / prior) * 100 : null,
    };
  });
}

/**
 * Build category summary rows for a table.
 */
export function buildCategorySummary(categories) {
  return categories.map((cat) => {
    const actualLen = (cat.actualMonthly || []).length;
    const monthIdx = actualLen > 0 ? actualLen - 1 : getCurrentMonthIndex();

    const ytdActual = sumToMonth(cat.actualMonthly || [], monthIdx);
    const ytdBudget = sumToMonth(cat.budgetMonthly || [], monthIdx);
    const ytdPrior = sumToMonth(cat.priorYearMonthly || [], monthIdx);
    const annualBudget = cat.budgetAnnual || 0;
    const fullPrior = sumAll(cat.priorYearMonthly || []);
    const budgetVar = variance(ytdActual, ytdBudget);
    const budgetVarPct = variancePct(ytdActual, ytdBudget);
    const priorVar = variance(ytdActual, ytdPrior);
    const priorVarPct = variancePct(ytdActual, ytdPrior);

    return {
      id: cat.id,
      name: cat.name,
      ytdActual,
      ytdBudget,
      ytdPrior,
      annualBudget,
      fullPrior,
      budgetVar,
      budgetVarPct,
      priorVar,
      priorVarPct,
      pctOfAnnualBudget: annualBudget > 0 ? (ytdActual / annualBudget) * 100 : 0,
    };
  });
}
