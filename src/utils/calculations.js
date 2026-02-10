import { CURRENT_MONTH_INDEX } from '../data/financialData';

/**
 * Sum array values up to (and including) a given month index.
 */
export function sumToMonth(arr, monthIndex = CURRENT_MONTH_INDEX) {
  return arr.slice(0, monthIndex + 1).reduce((a, b) => a + b, 0);
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
export function ytdTotal(categories, field = 'actualMonthly') {
  return categories.reduce((sum, cat) => sum + sumToMonth(cat[field]), 0);
}

/**
 * Calculate YTD budget total.
 */
export function ytdBudgetTotal(categories) {
  return categories.reduce(
    (sum, cat) => sum + sumToMonth(cat.budgetMonthly),
    0,
  );
}

/**
 * Calculate prior year YTD total.
 */
export function ytdPriorYearTotal(categories) {
  return categories.reduce(
    (sum, cat) => sum + sumToMonth(cat.priorYearMonthly),
    0,
  );
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
 * Variance (actual - budget). Positive = favorable for revenue, unfavorable for expense.
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
  return months.map((month, i) => {
    const budget = categories.reduce(
      (sum, cat) => sum + (cat.budgetMonthly[i] || 0),
      0,
    );
    const actual =
      i <= CURRENT_MONTH_INDEX
        ? categories.reduce(
            (sum, cat) => sum + (cat.actualMonthly[i] || 0),
            0,
          )
        : null;
    const priorYear = categories.reduce(
      (sum, cat) => sum + (cat.priorYearMonthly[i] || 0),
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
    const ytdActual = sumToMonth(cat.actualMonthly);
    const ytdBudget = sumToMonth(cat.budgetMonthly);
    const ytdPrior = sumToMonth(cat.priorYearMonthly);
    const annualBudget = cat.budgetAnnual;
    const fullPrior = sumAll(cat.priorYearMonthly);
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
