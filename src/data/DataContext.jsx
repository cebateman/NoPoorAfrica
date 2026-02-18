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
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { useAuth } from './AuthContext';

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
  const { isAdmin, user } = useAuth();

  // Raw CSV text storage
  const [mappingCSV, setMappingCSV] = useState(() => loadStored(STORAGE_KEYS.mapping));
  const [budgetCSV, setBudgetCSV] = useState(() => loadStored(STORAGE_KEYS.budget));
  const [actualsCSV, setActualsCSV] = useState(() => loadStored(STORAGE_KEYS.actuals));
  const [revenueCSV, setRevenueCSV] = useState(() => loadStored(STORAGE_KEYS.revenue));

  // Dashboard settings synced via Firestore (admin writes, viewers read)
  const [sharedSettings, setSharedSettings] = useState(null);
  const [firestoreReady, setFirestoreReady] = useState(!isFirebaseConfigured);

  // Clean up old priorYear key from localStorage
  useEffect(() => {
    try { localStorage.removeItem('npa_prior_year_csv'); } catch { /* noop */ }
  }, []);

  // Persist to localStorage on change (local cache for both admin and viewers)
  useEffect(() => { saveStored(STORAGE_KEYS.mapping, mappingCSV); }, [mappingCSV]);
  useEffect(() => { saveStored(STORAGE_KEYS.budget, budgetCSV); }, [budgetCSV]);
  useEffect(() => { saveStored(STORAGE_KEYS.actuals, actualsCSV); }, [actualsCSV]);
  useEffect(() => { saveStored(STORAGE_KEYS.revenue, revenueCSV); }, [revenueCSV]);

  // ── Firestore: real-time sync for shared data ──
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user) {
      setFirestoreReady(true);
      return;
    }

    let didInitialSync = false;

    // Subscribe to CSV data changes
    const unsubData = onSnapshot(
      doc(db, 'appData', 'csvFiles'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          // Only update state if data differs (prevents loops for admin)
          if (data.mappingCSV !== undefined) setMappingCSV((prev) => data.mappingCSV !== prev ? data.mappingCSV : prev);
          if (data.budgetCSV !== undefined) setBudgetCSV((prev) => data.budgetCSV !== prev ? data.budgetCSV : prev);
          if (data.actualsCSV !== undefined) setActualsCSV((prev) => data.actualsCSV !== prev ? data.actualsCSV : prev);
          if (data.revenueCSV !== undefined) setRevenueCSV((prev) => data.revenueCSV !== prev ? data.revenueCSV : prev);
        }

        // On first snapshot, if admin has localStorage data that Firestore is missing, push it up.
        // This handles data uploaded before auth was added.
        if (!didInitialSync && isAdmin) {
          didInitialSync = true;
          const fsData = snap.exists() ? snap.data() : {};
          const updates = {};
          const m = loadStored(STORAGE_KEYS.mapping);
          const b = loadStored(STORAGE_KEYS.budget);
          const a = loadStored(STORAGE_KEYS.actuals);
          const r = loadStored(STORAGE_KEYS.revenue);
          if (m && !fsData.mappingCSV) updates.mappingCSV = m;
          if (b && !fsData.budgetCSV) updates.budgetCSV = b;
          if (a && !fsData.actualsCSV) updates.actualsCSV = a;
          if (r && !fsData.revenueCSV) updates.revenueCSV = r;
          if (Object.keys(updates).length > 0) {
            setDoc(doc(db, 'appData', 'csvFiles'), updates, { merge: true }).catch((err) =>
              console.error('Error pushing localStorage data to Firestore:', err),
            );
          }
        }
        setFirestoreReady(true);
      },
      (err) => {
        console.error('Firestore CSV sync error:', err);
        setFirestoreReady(true);
      },
    );

    // Subscribe to dashboard settings changes
    const unsubSettings = onSnapshot(
      doc(db, 'appData', 'dashboardSettings'),
      (snap) => {
        if (snap.exists()) {
          setSharedSettings(snap.data());
        }
      },
      (err) => {
        console.error('Firestore settings sync error:', err);
      },
    );

    return () => {
      unsubData();
      unsubSettings();
    };
  }, [user, isAdmin]);

  // ── Admin: push CSV data to Firestore when uploading ──
  const syncToFirestore = useCallback(async (updates) => {
    if (!isFirebaseConfigured || !db || !isAdmin) return;
    try {
      await setDoc(doc(db, 'appData', 'csvFiles'), updates, { merge: true });
    } catch (err) {
      console.error('Error syncing to Firestore:', err);
    }
  }, [isAdmin]);

  // ── Admin: save dashboard settings to Firestore ──
  const saveDashboardSettings = useCallback(async (settings) => {
    if (!isFirebaseConfigured || !db || !isAdmin) return;
    try {
      await setDoc(doc(db, 'appData', 'dashboardSettings'), settings, { merge: true });
    } catch (err) {
      console.error('Error saving dashboard settings:', err);
    }
  }, [isAdmin]);

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

  // Upload handlers — admin syncs to Firestore, local always saves to localStorage
  const uploadMapping = useCallback((text) => {
    setMappingCSV(text);
    syncToFirestore({ mappingCSV: text });
  }, [syncToFirestore]);

  const uploadBudget = useCallback((text) => {
    setBudgetCSV(text);
    syncToFirestore({ budgetCSV: text });
  }, [syncToFirestore]);

  const uploadActuals = useCallback((text) => {
    setActualsCSV(text);
    syncToFirestore({ actualsCSV: text });
  }, [syncToFirestore]);

  const uploadRevenue = useCallback((text) => {
    setRevenueCSV(text);
    syncToFirestore({ revenueCSV: text });
  }, [syncToFirestore]);

  const clearAll = useCallback(() => {
    setMappingCSV('');
    setBudgetCSV('');
    setActualsCSV('');
    setRevenueCSV('');
    Object.values(STORAGE_KEYS).forEach((k) => {
      try { localStorage.removeItem(k); } catch { /* noop */ }
    });
    syncToFirestore({ mappingCSV: '', budgetCSV: '', actualsCSV: '', revenueCSV: '' });
  }, [syncToFirestore]);

  const clearFile = useCallback((type) => {
    const setters = { mapping: setMappingCSV, budget: setBudgetCSV, actuals: setActualsCSV, revenue: setRevenueCSV };
    const firestoreKeys = { mapping: 'mappingCSV', budget: 'budgetCSV', actuals: 'actualsCSV', revenue: 'revenueCSV' };
    if (setters[type]) {
      setters[type]('');
      try { localStorage.removeItem(STORAGE_KEYS[type]); } catch { /* noop */ }
      syncToFirestore({ [firestoreKeys[type]]: '' });
    }
  }, [syncToFirestore]);

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

    // Shared dashboard settings (Firestore)
    sharedSettings,
    saveDashboardSettings,
    firestoreReady,

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
