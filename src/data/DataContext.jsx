import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  parseDataCSV,
  parseMappingCSV,
  applyMapping,
  buildDashboardCategories,
  uniqueValues,
  getDataMonths,
  getDataYears,
} from '../utils/csvParser';

const DataContext = createContext(null);

const STORAGE_KEYS = {
  mapping: 'npa_mapping_csv',
  budget: 'npa_budget_csv',
  actuals: 'npa_actuals_csv',
  priorYear: 'npa_prior_year_csv',
};

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
  const [priorYearCSV, setPriorYearCSV] = useState(() => loadStored(STORAGE_KEYS.priorYear));

  // Persist to localStorage on change
  useEffect(() => { saveStored(STORAGE_KEYS.mapping, mappingCSV); }, [mappingCSV]);
  useEffect(() => { saveStored(STORAGE_KEYS.budget, budgetCSV); }, [budgetCSV]);
  useEffect(() => { saveStored(STORAGE_KEYS.actuals, actualsCSV); }, [actualsCSV]);
  useEffect(() => { saveStored(STORAGE_KEYS.priorYear, priorYearCSV); }, [priorYearCSV]);

  // Parse mapping
  const mapping = mappingCSV ? parseMappingCSV(mappingCSV) : {};

  // Parse data files and apply mapping
  const parseAndMap = useCallback(
    (csv) => {
      if (!csv) return [];
      const rows = parseDataCSV(csv);
      return Object.keys(mapping).length > 0 ? applyMapping(rows, mapping) : rows;
    },
    [mapping],
  );

  const budgetRows = parseAndMap(budgetCSV);
  const actualsRows = parseAndMap(actualsCSV);
  const priorYearRows = parseAndMap(priorYearCSV);

  // Determine what data is available
  const hasMapping = Object.keys(mapping).length > 0;
  const hasBudget = budgetRows.length > 0;
  const hasActuals = actualsRows.length > 0;
  const hasPriorYear = priorYearRows.length > 0;
  const hasData = hasBudget || hasActuals;

  // Get metadata from data
  const allRows = [...budgetRows, ...actualsRows, ...priorYearRows];
  const centers = uniqueValues(allRows, 'centerLocation');
  const dataYears = getDataYears(allRows);
  const dataMonths = getDataMonths(hasActuals ? actualsRows : budgetRows);

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
        filterByCenter(budgetRows),
        filterByCenter(priorYearRows),
      );
    },
    [actualsRows, budgetRows, priorYearRows],
  );

  // Build all-center categories
  const allCategories = buildDashboardCategories(actualsRows, budgetRows, priorYearRows);

  // Upload handlers
  const uploadMapping = useCallback((text) => setMappingCSV(text), []);
  const uploadBudget = useCallback((text) => setBudgetCSV(text), []);
  const uploadActuals = useCallback((text) => setActualsCSV(text), []);
  const uploadPriorYear = useCallback((text) => setPriorYearCSV(text), []);

  const clearAll = useCallback(() => {
    setMappingCSV('');
    setBudgetCSV('');
    setActualsCSV('');
    setPriorYearCSV('');
    Object.values(STORAGE_KEYS).forEach((k) => {
      try { localStorage.removeItem(k); } catch { /* noop */ }
    });
  }, []);

  const clearFile = useCallback((type) => {
    const setters = { mapping: setMappingCSV, budget: setBudgetCSV, actuals: setActualsCSV, priorYear: setPriorYearCSV };
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

    // Raw CSV text (for showing file info)
    mappingCSV,
    budgetCSV,
    actualsCSV,
    priorYearCSV,

    // Actions
    uploadMapping,
    uploadBudget,
    uploadActuals,
    uploadPriorYear,
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
