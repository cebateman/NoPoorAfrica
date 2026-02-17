import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  parseDataCSV,
  parseMappingCSV,
  parseRevenueCSV,
  applyMapping,
  buildDashboardCategories,
  buildRevenueCategories,
  uniqueValues,
  getDataMonths,
  getDataYears,
} from '../utils/csvParser';

const DataContext = createContext(null);

const STORAGE_KEYS = {
  mapping: 'npa_mapping_csv',
  budget: 'npa_budget_csv',
  actuals: 'npa_actuals_csv',
  revenue: 'npa_revenue_csv',
};

/**
 * Revenue categories that are restricted / designated funds.
 * These are tracked separately as FYI and excluded from operating
 * revenue totals so they don't offset Girls Sponsorship expenses.
 * Matching is case-insensitive and uses "includes" for flexibility.
 */
const RESTRICTED_REVENUE_PATTERNS = ['family restoration'];

/**
 * Load raw CSV text from localStorage.
 */
function loadStored(key) {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

/**
 * Save raw CSV text to localStorage.
 */
function saveStored(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage might be full — silently fail
  }
}

export function DataProvider({ children }) {
  // Raw CSV text storage
  const [mappingCSV, setMappingCSV] = useState(() => loadStored(STORAGE_KEYS.mapping));
  const [budgetCSV, setBudgetCSV] = useState(() => loadStored(STORAGE_KEYS.budget));
  const [actualsCSV, setActualsCSV] = useState(() => loadStored(STORAGE_KEYS.actuals));
  const [revenueCSV, setRevenueCSV] = useState(() => loadStored(STORAGE_KEYS.revenue));

  // Clean up old priorYear key from localStorage
  useEffect(() => {
    try { localStorage.removeItem('npa_prior_year_csv'); } catch { /* noop */ }
  }, []);

  // Persist to localStorage on change
  useEffect(() => { saveStored(STORAGE_KEYS.mapping, mappingCSV); }, [mappingCSV]);
  useEffect(() => { saveStored(STORAGE_KEYS.budget, budgetCSV); }, [budgetCSV]);
  useEffect(() => { saveStored(STORAGE_KEYS.actuals, actualsCSV); }, [actualsCSV]);
  useEffect(() => { saveStored(STORAGE_KEYS.revenue, revenueCSV); }, [revenueCSV]);

  // Parse mapping
  const mapping = mappingCSV ? parseMappingCSV(mappingCSV) : {};

  // Parse expense data files and apply mapping
  const parseAndMap = useCallback(
    (csv) => {
      if (!csv) return [];
      const rows = parseDataCSV(csv);
      return Object.keys(mapping).length > 0 ? applyMapping(rows, mapping) : rows;
    },
    [mapping],
  );

  const budgetRows = parseAndMap(budgetCSV);
  const allActualsRows = parseAndMap(actualsCSV);

  // Parse revenue data
  const allRevenueRows = useMemo(() => {
    if (!revenueCSV) return [];
    return parseRevenueCSV(revenueCSV);
  }, [revenueCSV]);

  // Auto-split actuals by year: most recent year = current, year before = prior
  const { actualsRows, priorYearRows, actualsYears } = useMemo(() => {
    if (allActualsRows.length === 0) {
      return { actualsRows: [], priorYearRows: [], actualsYears: [] };
    }

    const years = [...new Set(allActualsRows.map((r) => r.year))].sort((a, b) => a - b);
    const maxYear = years[years.length - 1];
    const priorYear = years.length > 1 ? years[years.length - 2] : null;

    return {
      actualsRows: allActualsRows.filter((r) => r.year === maxYear),
      priorYearRows: priorYear ? allActualsRows.filter((r) => r.year === priorYear) : [],
      actualsYears: years,
    };
  }, [allActualsRows]);

  // Auto-split revenue by year
  const { revenueCurrentRows, revenuePriorRows, revenueYears } = useMemo(() => {
    if (allRevenueRows.length === 0) {
      return { revenueCurrentRows: [], revenuePriorRows: [], revenueYears: [] };
    }

    const years = [...new Set(allRevenueRows.map((r) => r.year))].sort((a, b) => a - b);
    const maxYear = years[years.length - 1];
    const priorYear = years.length > 1 ? years[years.length - 2] : null;

    return {
      revenueCurrentRows: allRevenueRows.filter((r) => r.year === maxYear),
      revenuePriorRows: priorYear ? allRevenueRows.filter((r) => r.year === priorYear) : [],
      revenueYears: years,
    };
  }, [allRevenueRows]);

  // Build revenue categories from uploaded data
  const revenueCategories = useMemo(
    () => buildRevenueCategories(revenueCurrentRows, revenuePriorRows),
    [revenueCurrentRows, revenuePriorRows],
  );

  // Split revenue into operating (counts toward KPIs) and restricted (FYI only).
  // Restricted funds (e.g. Family Restoration Project) are a separate project
  // and should not offset Girls Sponsorship program expenses.
  const { operatingRevenue, restrictedRevenue } = useMemo(() => {
    const isRestricted = (cat) =>
      RESTRICTED_REVENUE_PATTERNS.some((p) =>
        cat.name.toLowerCase().includes(p),
      );
    return {
      operatingRevenue: revenueCategories.filter((c) => !isRestricted(c)),
      restrictedRevenue: revenueCategories.filter((c) => isRestricted(c)),
    };
  }, [revenueCategories]);

  // Determine budget year from budget rows
  const budgetYear = useMemo(() => {
    if (budgetRows.length === 0) return null;
    const years = [...new Set(budgetRows.map((r) => r.year))].sort((a, b) => a - b);
    return years[years.length - 1]; // most recent year in budget
  }, [budgetRows]);

  // Filter budget rows to the budget year only (prevents double-counting
  // when the budget CSV contains multiple years)
  const filteredBudgetRows = useMemo(() => {
    if (!budgetYear || budgetRows.length === 0) return budgetRows;
    return budgetRows.filter((r) => r.year === budgetYear);
  }, [budgetRows, budgetYear]);

  // Actuals year and prior year
  const actualsYear = actualsYears.length > 0 ? actualsYears[actualsYears.length - 1] : null;
  const priorYear = actualsYears.length > 1 ? actualsYears[actualsYears.length - 2] : null;

  // Revenue years
  const revenueCurrentYear = revenueYears.length > 0 ? revenueYears[revenueYears.length - 1] : null;
  const revenuePriorYear = revenueYears.length > 1 ? revenueYears[revenueYears.length - 2] : null;

  // Determine what data is available
  const hasMapping = Object.keys(mapping).length > 0;
  const hasBudget = budgetRows.length > 0;
  const hasActuals = actualsRows.length > 0;
  const hasPriorYear = priorYearRows.length > 0;
  const hasRevenue = allRevenueRows.length > 0;
  const hasData = hasBudget || hasActuals;

  // Get metadata from data
  const allRows = [...filteredBudgetRows, ...allActualsRows];
  const centers = uniqueValues(allRows, 'centerLocation');
  const dataYears = actualsYears.length > 0 ? actualsYears : getDataYears(allRows);
  const dataMonths = getDataMonths(hasActuals ? actualsRows : filteredBudgetRows);

  // Determine current month index (last month with actual data)
  const currentMonthIndex = hasActuals
    ? Math.max(...getDataMonths(actualsRows)) - 1 // Convert 1-based month to 0-based index
    : -1;

  // Build dashboard categories by center
  const getCategoriesForCenter = useCallback(
    (center) => {
      const filterByCenter = (rows) =>
        center ? rows.filter((r) => r.centerLocation === center) : rows;

      return buildDashboardCategories(
        filterByCenter(actualsRows),
        filterByCenter(filteredBudgetRows),
        filterByCenter(priorYearRows),
      );
    },
    [actualsRows, filteredBudgetRows, priorYearRows],
  );

  // Build all-center categories
  const allCategories = buildDashboardCategories(actualsRows, filteredBudgetRows, priorYearRows);

  // Upload handlers
  const uploadMapping = useCallback((text) => setMappingCSV(text), []);
  const uploadBudget = useCallback((text) => setBudgetCSV(text), []);
  const uploadActuals = useCallback((text) => setActualsCSV(text), []);
  const uploadRevenue = useCallback((text) => setRevenueCSV(text), []);

  const clearAll = useCallback(() => {
    setMappingCSV('');
    setBudgetCSV('');
    setActualsCSV('');
    setRevenueCSV('');
    Object.values(STORAGE_KEYS).forEach((k) => {
      try { localStorage.removeItem(k); } catch { /* noop */ }
    });
  }, []);

  const clearFile = useCallback((type) => {
    const setters = { mapping: setMappingCSV, budget: setBudgetCSV, actuals: setActualsCSV, revenue: setRevenueCSV };
    if (setters[type]) {
      setters[type]('');
      try { localStorage.removeItem(STORAGE_KEYS[type]); } catch { /* noop */ }
    }
  }, []);

  const value = {
    // State
    hasMapping,
    hasBudget,
    hasActuals,
    hasPriorYear,
    hasRevenue,
    hasData,
    mapping,
    budgetRows,
    actualsRows,
    priorYearRows,
    centers,
    dataYears,
    dataMonths,
    currentMonthIndex,
    allCategories,
    getCategoriesForCenter,
    actualsYear,
    priorYear,
    budgetYear,
    actualsYears,
    revenueCurrentYear,
    revenuePriorYear,
    revenueYears,
    revenueCategories,
    operatingRevenue,
    restrictedRevenue,
    revenueCurrentRows,
    revenuePriorRows,

    // Raw CSV text (for showing file info)
    mappingCSV,
    budgetCSV,
    actualsCSV,
    revenueCSV,

    // Row counts for the full (unsplit) data
    totalActualsRowCount: allActualsRows.length,
    totalRevenueRowCount: allRevenueRows.length,

    // Actions
    uploadMapping,
    uploadBudget,
    uploadActuals,
    uploadRevenue,
    clearAll,
    clearFile,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
