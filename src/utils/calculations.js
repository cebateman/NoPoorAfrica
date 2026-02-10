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
 */
export function buildMonthlyComparison(categories, months) {
  // Determine max month with actual data
  const maxActualMonth = categories.reduce((max, cat) => {
    return Math.max(max, (cat.actualMonthly || []).length - 1);
  }, -1);

  return months.map((month, i) => {
    const budget = categories.reduce(
      (sum, cat) => sum + (cat.budgetMonthly[i] || 0),
      0,
    );
    const actual =
      i <= maxActualMonth
        ? categories.reduce(
            (sum, cat) => sum + ((cat.actualMonthly || [])[i] || 0),
            0,
          )
        : null;
    const priorYear = categories.reduce(
      (sum, cat) => sum + ((cat.priorYearMonthly || [])[i] || 0),
      0,
    );
    return { month, budget, actual, priorYear };
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
