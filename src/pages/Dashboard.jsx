import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  Settings,
  Eye,
  EyeOff,
  Calendar,
  Upload,
  Printer,
  Info,
  ChevronUp,
  ChevronDown,
  UserPlus,
  Trash2,
  Users,
  Shield,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import {
  MONTHS,
  FISCAL_YEAR,
} from '../data/financialData';
import { useData } from '../data/DataContext';
import { useCurrency } from '../data/CurrencyContext';
import { useAuth } from '../data/AuthContext';
import {
  ytdTotal,
  ytdBudgetTotal,
  ytdPriorYearTotal,
  fullYearBudgetTotal,
  variance,
  variancePct,
  buildMonthlyComparison,
  buildTimelineData,
  buildCategorySummary,
  monthTotal,
  buildMonthlyCategoryDetail,
} from '../utils/calculations';
import KpiCard from '../components/KpiCard';
import FinancialTable from '../components/FinancialTable';
import MonthlyChart from '../components/MonthlyChart';
import BudgetProgressBar from '../components/BudgetProgressBar';
import TimelineChart from '../components/TimelineChart';

const PIE_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#be185d', '#65a30d'];

// ── Dashboard section definitions ──
const SECTIONS = [
  { id: 'fullYearOutlook', label: 'Full Year Outlook (YTD + Budgeted Remaining)', group: 'Forecast' },
  { id: 'yoyQuarterly',    label: 'YoY Quarterly Comparison',                     group: 'Forecast' },
  { id: 'monthlyKpis',    label: 'Monthly KPI Cards',            group: 'Monthly Review' },
  { id: 'monthlyBridge',  label: 'Monthly Budget Bridge',         group: 'Monthly Review' },
  { id: 'monthlyDetail',  label: 'Monthly Category Breakdown',   group: 'Monthly Review' },
  { id: 'restrictedFunds', label: 'Restricted Funds (FYI)',        group: 'KPI Cards' },
  { id: 'kpiRevenue',     label: 'KPI: YTD Revenue',             group: 'KPI Cards' },
  { id: 'kpiExpenses',    label: 'KPI: YTD Expenses',            group: 'KPI Cards' },
  { id: 'kpiNet',         label: 'KPI: Net Position',            group: 'KPI Cards' },
  { id: 'kpiBudget',      label: 'KPI: Annual Budget',           group: 'KPI Cards' },
  { id: 'timeline',       label: 'Expense Timeline (full width)', group: 'Charts' },
  { id: 'pieBreakdown',   label: 'Pie: Program Breakdown',       group: 'Charts' },
  { id: 'chartRevenue',   label: 'Revenue Bar Chart',            group: 'Charts' },
  { id: 'chartExpense',   label: 'Expense Bar Chart',            group: 'Charts' },
  { id: 'tableExpenses',  label: 'Expense Table',                group: 'Tables' },
  { id: 'tableRevenue',   label: 'Revenue Table',                group: 'Tables' },
  { id: 'budgetExpenses', label: 'Budget Progress: Expenses',    group: 'Budget Progress' },
  { id: 'budgetRevenue',  label: 'Budget Progress: Revenue',     group: 'Budget Progress' },
];

const ALL_SECTION_IDS = SECTIONS.map((s) => s.id);
const STORAGE_KEY = 'npa_dashboard_sections';
const ORDER_STORAGE_KEY = 'npa_dashboard_order';

// ── Visibility persistence ──

function loadSectionVisibility() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const result = {};
      ALL_SECTION_IDS.forEach((id) => {
        result[id] = parsed[id] !== undefined ? parsed[id] : true;
      });
      return result;
    }
  } catch { /* noop */ }
  const result = {};
  ALL_SECTION_IDS.forEach((id) => { result[id] = true; });
  return result;
}

function saveSectionVisibility(visibility) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
  } catch { /* noop */ }
}

// ── Section order persistence ──

function getDefaultGroupOrders() {
  const orders = {};
  SECTIONS.forEach((s) => {
    if (!orders[s.group]) orders[s.group] = [];
    orders[s.group].push(s.id);
  });
  return orders;
}

function loadSectionOrder() {
  try {
    const stored = localStorage.getItem(ORDER_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const defaults = getDefaultGroupOrders();
      const result = {};
      for (const [group, defaultIds] of Object.entries(defaults)) {
        const storedIds = parsed[group] || [];
        // Keep stored order, filtered to only still-valid IDs
        const valid = storedIds.filter((id) => defaultIds.includes(id));
        // Append any new IDs not yet in stored order
        const missing = defaultIds.filter((id) => !valid.includes(id));
        result[group] = [...valid, ...missing];
      }
      return result;
    }
  } catch { /* noop */ }
  return getDefaultGroupOrders();
}

function saveSectionOrder(order) {
  try {
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch { /* noop */ }
}

// ── Admin User Management Panel ──
const AVAILABLE_PAGES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'donors', label: 'Donors' },
];

function UserManagementPanel({ createViewerAccount, listUsers, removeUser, updateUserPages }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const list = await listUsers();
    setUsers(list);
    setLoading(false);
  }, [listUsers]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleCreate = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!newEmail.trim() || !newPassword.trim()) {
      setError('Email and password are required.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setCreating(true);
    try {
      await createViewerAccount(newEmail.trim(), newPassword, newName.trim());
      setSuccess(`Account created for ${newEmail.trim()}`);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }, [newEmail, newPassword, newName, createViewerAccount, fetchUsers]);

  const handleRemove = useCallback(async (uid, email) => {
    if (!window.confirm(`Remove access for ${email}? They won't be able to view the dashboard.`)) return;
    try {
      await removeUser(uid);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  }, [removeUser, fetchUsers]);

  const handleTogglePage = useCallback(async (uid, pageId, currentPages) => {
    const pages = currentPages || AVAILABLE_PAGES.map((p) => p.id);
    const updated = pages.includes(pageId)
      ? pages.filter((p) => p !== pageId)
      : [...pages, pageId];
    try {
      await updateUserPages(uid, updated);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, allowedPages: updated } : u))
      );
    } catch (err) {
      setError(err.message);
    }
  }, [updateUserPages]);

  return (
    <div className="settings-panel user-mgmt-panel">
      <div className="settings-panel__header">
        <h3><Shield size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Manage Team Access</h3>
      </div>

      {/* Create new viewer */}
      <form className="user-mgmt__form" onSubmit={handleCreate}>
        <h4 className="user-mgmt__subtitle">Add Viewer Account</h4>
        <div className="user-mgmt__fields">
          <input
            type="text"
            placeholder="Display name (optional)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="user-mgmt__input"
          />
          <input
            type="email"
            placeholder="Email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="user-mgmt__input"
            required
          />
          <input
            type="text"
            placeholder="Temporary password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="user-mgmt__input"
            required
          />
          <button type="submit" className="btn btn--sm btn--outline" disabled={creating}>
            <UserPlus size={14} />
            {creating ? 'Creating...' : 'Create Account'}
          </button>
        </div>
        {error && <p className="user-mgmt__error">{error}</p>}
        {success && <p className="user-mgmt__success">{success}</p>}
        <p className="user-mgmt__hint">
          Share the email and temporary password with the team member. They can sign in to view the dashboard.
        </p>
      </form>

      {/* User list */}
      <div className="user-mgmt__list">
        <h4 className="user-mgmt__subtitle">Current Users</h4>
        {loading ? (
          <p className="user-mgmt__hint">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="user-mgmt__hint">No users found.</p>
        ) : (
          <table className="user-mgmt__table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Page Access</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const pages = u.allowedPages || AVAILABLE_PAGES.map((p) => p.id);
                return (
                  <tr key={u.uid}>
                    <td>{u.displayName || '—'}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`user-mgmt__role user-mgmt__role--${u.role}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.role === 'admin' ? (
                        <span className="user-mgmt__hint-text">All pages</span>
                      ) : (
                        <div className="user-mgmt__page-checks">
                          {AVAILABLE_PAGES.map((pg) => (
                            <label key={pg.id} className="user-mgmt__page-label">
                              <input
                                type="checkbox"
                                checked={pages.includes(pg.id)}
                                onChange={() => handleTogglePage(u.uid, pg.id, pages)}
                              />
                              {pg.label}
                            </label>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      {u.role !== 'admin' && (
                        <button
                          className="btn btn--sm btn--danger"
                          onClick={() => handleRemove(u.uid, u.email)}
                          title="Remove access"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const {
    hasData, hasRevenue, hasUsData, revenueCategories, operatingRevenue, restrictedRevenue,
    allCategories, centers, getCategoriesForCenter, dataYears, actualsYear,
    priorYear, budgetYear, revenueCurrentYear, revenuePriorYear,
    sharedSettings, saveDashboardSettings,
  } = useData();
  const { format } = useCurrency();
  const { isAdmin, isViewer, authEnabled, createViewerAccount, listUsers, removeUser, updateUserPages } = useAuth();
  const [selectedCenter, setSelectedCenter] = useState('');
  const [locationScope, setLocationScope] = useState('all'); // 'all' | 'excludeUs' | 'usOnly'
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [visibility, setVisibility] = useState(loadSectionVisibility);
  const [sectionOrder, setSectionOrder] = useState(loadSectionOrder);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(null);

  // For viewers: apply shared settings from Firestore when available
  useEffect(() => {
    if (isViewer && sharedSettings) {
      if (sharedSettings.visibility) {
        const merged = {};
        ALL_SECTION_IDS.forEach((id) => {
          merged[id] = sharedSettings.visibility[id] !== undefined
            ? sharedSettings.visibility[id]
            : true;
        });
        setVisibility(merged);
      }
      if (sharedSettings.order) {
        const defaults = getDefaultGroupOrders();
        const result = {};
        for (const [group, defaultIds] of Object.entries(defaults)) {
          const storedIds = sharedSettings.order[group] || [];
          const valid = storedIds.filter((id) => defaultIds.includes(id));
          const missing = defaultIds.filter((id) => !valid.includes(id));
          result[group] = [...valid, ...missing];
        }
        setSectionOrder(result);
      }
    }
  }, [isViewer, sharedSettings]);

  const show = (id) => visibility[id] !== false;
  const getGroupOrder = useCallback((group) => sectionOrder[group] || [], [sectionOrder]);

  const handlePrint = useCallback(() => {
    const el = document.querySelector('.dashboard');
    if (el) el.setAttribute('data-print-date', new Date().toLocaleDateString());
    window.print();
  }, []);

  // Admin: persist settings changes to both localStorage and Firestore
  const persistSettings = useCallback((newVisibility, newOrder) => {
    saveSectionVisibility(newVisibility || visibility);
    saveSectionOrder(newOrder || sectionOrder);
    if (isAdmin) {
      saveDashboardSettings({
        visibility: newVisibility || visibility,
        order: newOrder || sectionOrder,
      });
    }
  }, [isAdmin, visibility, sectionOrder, saveDashboardSettings]);

  const toggleSection = useCallback((id) => {
    setVisibility((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveSectionVisibility(next);
      if (isAdmin) saveDashboardSettings({ visibility: next });
      return next;
    });
  }, [isAdmin, saveDashboardSettings]);

  const setAllSections = useCallback((value) => {
    const next = {};
    ALL_SECTION_IDS.forEach((id) => { next[id] = value; });
    saveSectionVisibility(next);
    setVisibility(next);
    if (isAdmin) saveDashboardSettings({ visibility: next });
  }, [isAdmin, saveDashboardSettings]);

  const moveSection = useCallback((group, fromIdx, direction) => {
    setSectionOrder((prev) => {
      const arr = [...(prev[group] || [])];
      const toIdx = fromIdx + direction;
      if (toIdx < 0 || toIdx >= arr.length) return prev;
      [arr[fromIdx], arr[toIdx]] = [arr[toIdx], arr[fromIdx]];
      const next = { ...prev, [group]: arr };
      saveSectionOrder(next);
      if (isAdmin) saveDashboardSettings({ order: next });
      return next;
    });
  }, [isAdmin, saveDashboardSettings]);

  // Operating revenue (excludes restricted/designated funds like Family Restoration)
  const activeRevenue = hasRevenue ? operatingRevenue : [];
  // All revenue categories (including restricted) for the full revenue table/chart
  const allRevenue = hasRevenue ? revenueCategories : [];
  // Restricted / designated funds shown as FYI only
  const activeRestricted = hasRevenue ? restrictedRevenue : [];

  // Expense categories from uploaded data
  // Applies both center filter and location scope filter (US include/exclude/only)
  const expenseCategories = hasData
    ? (selectedCenter || locationScope !== 'all'
        ? getCategoriesForCenter(selectedCenter, locationScope)
        : allCategories)
    : [];

  const year = hasData && dataYears.length > 0 ? dataYears[dataYears.length - 1] : FISCAL_YEAR;

  // Determine data months
  const maxActualMonths = expenseCategories.reduce(
    (max, cat) => Math.max(max, (cat.actualMonthly || []).length),
    0,
  );
  const dataMonthLabel = maxActualMonths > 0 ? MONTHS[maxActualMonths - 1] : null;

  // ── Full Year Outlook: YTD Actuals + Budgeted Remaining ──
  // Builds a per-category forecast assuming remaining months hit budget.
  const outlookRows = useMemo(() => {
    if (!hasData || expenseCategories.length === 0) return [];
    return expenseCategories.map((cat) => {
      const actuals = cat.actualMonthly || [];
      const budget = cat.budgetMonthly || [];
      const ytdActual = actuals.reduce((s, v) => s + v, 0);
      // Remaining = budget from (maxActualMonths) through end of year
      const budgetRemaining = budget
        .slice(maxActualMonths)
        .reduce((s, v) => s + v, 0);
      const outlook = ytdActual + budgetRemaining;
      const budgetAnnual = cat.budgetAnnual || 0;
      const variance = outlook - budgetAnnual;
      const variancePct = budgetAnnual !== 0 ? variance / budgetAnnual : 0;
      return {
        id: cat.id,
        name: cat.name,
        ytdActual,
        budgetRemaining,
        outlook,
        budgetAnnual,
        variance,
        variancePct,
      };
    });
  }, [hasData, expenseCategories, maxActualMonths]);

  const outlookTotals = useMemo(() => {
    const t = outlookRows.reduce(
      (acc, r) => ({
        ytdActual: acc.ytdActual + r.ytdActual,
        budgetRemaining: acc.budgetRemaining + r.budgetRemaining,
        outlook: acc.outlook + r.outlook,
        budgetAnnual: acc.budgetAnnual + r.budgetAnnual,
      }),
      { ytdActual: 0, budgetRemaining: 0, outlook: 0, budgetAnnual: 0 },
    );
    const variance = t.outlook - t.budgetAnnual;
    const variancePct = t.budgetAnnual !== 0 ? variance / t.budgetAnnual : 0;
    return { ...t, variance, variancePct };
  }, [outlookRows]);

  // Labels for period headers
  const ytdLabel = maxActualMonths > 0
    ? `YTD Actual (Jan\u2013${MONTHS[maxActualMonths - 1]})`
    : 'YTD Actual';
  const remainingLabel = maxActualMonths > 0 && maxActualMonths < 12
    ? `Budgeted Remaining (${MONTHS[maxActualMonths]}\u2013Dec)`
    : 'Budgeted Remaining';

  // ── YoY Quarterly Comparison ──
  // For each category, compute prior year quarters (actuals) vs current year
  // quarters (actual where uploaded, budget for months not yet reported).
  const yoyQuarterly = useMemo(() => {
    if (!hasData || expenseCategories.length === 0) return { rows: [], totals: null };
    const quarterRanges = [[0, 2], [3, 5], [6, 8], [9, 11]]; // month index ranges

    const rows = expenseCategories.map((cat) => {
      const actuals = cat.actualMonthly || [];
      const budget = cat.budgetMonthly || [];
      const prior = cat.priorYearMonthly || [];

      // Build current-year monthly: actuals where we have them, budget otherwise
      const cyMonthly = [];
      for (let m = 0; m < 12; m++) {
        if (m < actuals.length) cyMonthly.push(actuals[m]);
        else cyMonthly.push(budget[m] || 0);
      }

      const sumRange = (arr, [start, end]) => {
        let s = 0;
        for (let i = start; i <= end; i++) s += arr[i] || 0;
        return s;
      };

      const pyQ = quarterRanges.map((r) => sumRange(prior, r));
      const cyQ = quarterRanges.map((r) => sumRange(cyMonthly, r));
      const pyTotal = pyQ.reduce((a, b) => a + b, 0);
      const cyTotal = cyQ.reduce((a, b) => a + b, 0);
      const yoyDollar = cyTotal - pyTotal;
      const yoyPct = pyTotal !== 0 ? yoyDollar / pyTotal : 0;

      return {
        id: cat.id,
        name: cat.name,
        pyQ,
        cyQ,
        pyTotal,
        cyTotal,
        yoyDollar,
        yoyPct,
      };
    });

    const totals = rows.reduce(
      (acc, r) => ({
        pyQ: acc.pyQ.map((v, i) => v + r.pyQ[i]),
        cyQ: acc.cyQ.map((v, i) => v + r.cyQ[i]),
        pyTotal: acc.pyTotal + r.pyTotal,
        cyTotal: acc.cyTotal + r.cyTotal,
      }),
      { pyQ: [0, 0, 0, 0], cyQ: [0, 0, 0, 0], pyTotal: 0, cyTotal: 0 },
    );
    totals.yoyDollar = totals.cyTotal - totals.pyTotal;
    totals.yoyPct = totals.pyTotal !== 0 ? totals.yoyDollar / totals.pyTotal : 0;

    return { rows, totals };
  }, [hasData, expenseCategories]);

  const hasYoyData = yoyQuarterly.rows.some((r) => r.pyTotal !== 0 || r.cyTotal !== 0);

  // ── Revenue ──
  const revActual = ytdTotal(activeRevenue);
  const revBudget = ytdBudgetTotal(activeRevenue);
  const revPrior = ytdPriorYearTotal(activeRevenue);
  const revAnnual = fullYearBudgetTotal(activeRevenue);

  // ── Total Expenses ──
  const totalExpActual = ytdTotal(expenseCategories);
  const totalExpBudget = ytdBudgetTotal(expenseCategories);
  const totalExpPrior = ytdPriorYearTotal(expenseCategories);
  const totalExpAnnual = fullYearBudgetTotal(expenseCategories);

  // Net (operating revenue only — restricted funds excluded)
  const netActual = revActual - totalExpActual;
  const netBudget = revBudget - totalExpBudget;
  const netPrior = revPrior - totalExpPrior;

  // Restricted / designated fund totals (FYI)
  const restrictedActual = ytdTotal(activeRestricted);
  const restrictedPrior = ytdPriorYearTotal(activeRestricted);

  // ── Table rows ──
  const revenueRows = buildCategorySummary(allRevenue);
  const expRows = buildCategorySummary(expenseCategories);

  // ── Charts ──
  const revActualsYr = revenueCurrentYear;
  const revPriorYr = revenuePriorYear;

  const revenueChartData = allRevenue.length > 0
    ? buildMonthlyComparison(allRevenue, MONTHS, {
        actualsYear: revActualsYr, budgetYear: null, priorYear: revPriorYr,
      })
    : [];

  const expenseChartData = expenseCategories.length > 0
    ? buildMonthlyComparison(expenseCategories, MONTHS, {
        actualsYear: actualsYear, budgetYear: budgetYear, priorYear: priorYear,
      })
    : [];

  // ── Timeline ──
  const timelineData = expenseCategories.length > 0
    ? buildTimelineData(expenseCategories, MONTHS, {
        actualsYear: actualsYear, budgetYear: budgetYear, priorYear: priorYear,
      })
    : [];

  // ── Pie data ──
  const pieData = expenseCategories
    .map((cat) => ({ name: cat.name, value: ytdTotal([cat]) }))
    .filter((d) => d.value > 0);

  // ── Monthly Review ──
  const lastActualIdx = expenseCategories.reduce(
    (max, cat) => Math.max(max, (cat.actualMonthly || []).length - 1), -1,
  );
  const reviewMonthIdx = selectedMonthIdx !== null ? selectedMonthIdx : lastActualIdx;
  const reviewMonthLabel = reviewMonthIdx >= 0 ? MONTHS[reviewMonthIdx] : null;
  const reviewActualsYear = actualsYear || FISCAL_YEAR;
  const reviewPriorYr = priorYear || (reviewActualsYear - 1);

  // Monthly totals for the selected month
  const mMonthExpTotal = reviewMonthIdx >= 0 ? monthTotal(expenseCategories, 'actualMonthly', reviewMonthIdx) : 0;
  const mMonthBudgetTotal = reviewMonthIdx >= 0 ? monthTotal(expenseCategories, 'budgetMonthly', reviewMonthIdx) : 0;
  const mMonthPriorTotal = reviewMonthIdx >= 0 ? monthTotal(expenseCategories, 'priorYearMonthly', reviewMonthIdx) : 0;

  const mMonthRev = reviewMonthIdx >= 0 ? monthTotal(activeRevenue, 'actualMonthly', reviewMonthIdx) : 0;
  const mMonthRevBudget = reviewMonthIdx >= 0 ? monthTotal(activeRevenue, 'budgetMonthly', reviewMonthIdx) : 0;
  const mMonthRevPrior = reviewMonthIdx >= 0 ? monthTotal(activeRevenue, 'priorYearMonthly', reviewMonthIdx) : 0;

  // Restricted funds for the selected month (FYI only)
  const mMonthRestricted = reviewMonthIdx >= 0 ? monthTotal(activeRestricted, 'actualMonthly', reviewMonthIdx) : 0;

  const mMonthNet = mMonthRev - mMonthExpTotal;

  // Monthly category detail for the selected month
  const monthlyExpDetail = reviewMonthIdx >= 0 ? buildMonthlyCategoryDetail(expenseCategories, reviewMonthIdx) : [];

  // ── Budget Bridge ──
  const bridgeData = useMemo(() => {
    if (reviewMonthIdx < 0 || mMonthBudgetTotal === 0) return null;

    const totalVar = mMonthExpTotal - mMonthBudgetTotal;
    const rows = monthlyExpDetail
      .filter((r) => r.budgetVar !== null && r.budgetVar !== 0)
      .map((r) => ({ name: r.name, variance: r.budgetVar, notes: r.notes || [] }))
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

    const unfavorable = rows.filter((r) => r.variance > 0);
    const favorable = rows.filter((r) => r.variance < 0);

    const fmtAbs = (v) => format(Math.abs(v));
    const fmtVar = (r, tag) => `${r.name} (${r.variance > 0 ? '+' : ''}${format(r.variance)} vs ${tag})`;

    let narrative = '';
    if (totalVar === 0) {
      narrative = `In ${reviewMonthLabel}, total expenses came in exactly on budget at ${format(mMonthBudgetTotal)}.`;
    } else {
      const direction = totalVar > 0 ? 'above' : 'below';
      const drivers = (totalVar > 0 ? unfavorable : favorable).slice(0, 3).map((r) => fmtVar(r, 'budget'));
      const offsets = (totalVar > 0 ? favorable : unfavorable).slice(0, 2).map((r) => fmtVar(r, 'budget'));

      narrative = `In ${reviewMonthLabel}, expenses came in ${fmtAbs(totalVar)} ${direction} budget`;
      if (drivers.length > 0) narrative += `, driven by ${drivers.join(', ')}`;
      if (offsets.length > 0) narrative += `, partially offset by ${offsets.join(' and ')}`;
      narrative += '.';
    }

    return { baseTotal: mMonthBudgetTotal, actualTotal: mMonthExpTotal, totalVar, rows, narrative };
  }, [monthlyExpDetail, reviewMonthIdx, mMonthBudgetTotal, mMonthExpTotal, reviewMonthLabel, format]);

  // ── YoY Bridge ──
  const yoyBridgeData = useMemo(() => {
    if (reviewMonthIdx < 0 || mMonthPriorTotal === 0) return null;

    const totalVar = mMonthExpTotal - mMonthPriorTotal;
    const rows = monthlyExpDetail
      .filter((r) => r.priorVar !== null && r.priorVar !== 0)
      .map((r) => ({ name: r.name, variance: r.priorVar, notes: r.notes || [] }))
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

    const increases = rows.filter((r) => r.variance > 0);
    const decreases = rows.filter((r) => r.variance < 0);

    const fmtAbs = (v) => format(Math.abs(v));
    const fmtVar = (r) => `${r.name} (${r.variance > 0 ? '+' : ''}${format(r.variance)} YoY)`;

    let narrative = '';
    if (totalVar === 0) {
      narrative = `Year-over-year, ${reviewMonthLabel} expenses were flat at ${format(mMonthPriorTotal)}.`;
    } else {
      const direction = totalVar > 0 ? 'higher' : 'lower';
      const drivers = (totalVar > 0 ? increases : decreases).slice(0, 3).map(fmtVar);
      const offsets = (totalVar > 0 ? decreases : increases).slice(0, 2).map(fmtVar);

      narrative = `Year-over-year, ${reviewMonthLabel} expenses were ${fmtAbs(totalVar)} ${direction} than ${reviewPriorYr}`;
      if (drivers.length > 0) narrative += `, led by ${drivers.join(', ')}`;
      if (offsets.length > 0) narrative += `, partially offset by ${offsets.join(' and ')}`;
      narrative += '.';
    }

    return { baseTotal: mMonthPriorTotal, actualTotal: mMonthExpTotal, totalVar, rows, narrative };
  }, [monthlyExpDetail, reviewMonthIdx, mMonthPriorTotal, mMonthExpTotal, reviewMonthLabel, reviewPriorYr, format]);

  // Available months for the selector
  const availableMonths = [];
  for (let m = 0; m < 12; m++) {
    if (expenseCategories.some((cat) => m < (cat.actualMonthly || []).length)) {
      availableMonths.push(m);
    }
  }

  // Ordered group names (preserve declaration order)
  const groupNames = useMemo(() => {
    const seen = new Set();
    return SECTIONS.map((s) => s.group).filter((g) => { if (seen.has(g)) return false; seen.add(g); return true; });
  }, []);

  // Lookup: section id → section definition
  const sectionById = useMemo(() => {
    const map = {};
    SECTIONS.forEach((s) => { map[s.id] = s; });
    return map;
  }, []);

  const visibleCount = ALL_SECTION_IDS.filter((id) => visibility[id]).length;

  // ── Empty state ──
  if (!hasData && !hasRevenue) {
    return (
      <div className="dashboard">
        <div className="dashboard__header">
          <h2>
            <BarChart3 size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            No Poor Africa — Financial Leadership Dashboard
          </h2>
        </div>
        <div className="dashboard__empty">
          <Upload size={48} strokeWidth={1.5} />
          <h3>No data uploaded yet</h3>
          {isAdmin ? (
            <>
              <p>Upload your mapping, budget, actuals, and revenue files to get started.</p>
              <a href="#/upload" className="btn btn--primary">Go to Upload</a>
            </>
          ) : (
            <p>The admin has not uploaded financial data yet. Please check back later.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <div className="dashboard__header-top">
          <h2>
            <BarChart3 size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            No Poor Africa — FY {year}
          </h2>
          <div className="dashboard__actions">
            {isAdmin && (
              <button
                className="btn btn--outline btn--settings no-print"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings size={14} />
                Customize ({visibleCount}/{ALL_SECTION_IDS.length})
              </button>
            )}
            {isAdmin && authEnabled && (
              <button
                className="btn btn--outline no-print"
                onClick={() => setShowUserMgmt(!showUserMgmt)}
              >
                <Users size={14} />
                Manage Users
              </button>
            )}
            <button
              className="btn btn--outline no-print"
              onClick={handlePrint}
              title="Export as PDF"
            >
              <Printer size={14} />
              Print / PDF
            </button>
          </div>
        </div>
        <p className="dashboard__subtitle">
          Financial Leadership Dashboard
          {dataMonthLabel && <> &middot; Data through {dataMonthLabel} {year}</>}
        </p>
      </div>

      {/* ── User Management Panel (Admin only) ── */}
      {showUserMgmt && isAdmin && authEnabled && (
        <UserManagementPanel
          createViewerAccount={createViewerAccount}
          listUsers={listUsers}
          removeUser={removeUser}
          updateUserPages={updateUserPages}
        />
      )}

      {/* ── Settings Panel (Admin only) ── */}
      {showSettings && isAdmin && (
        <div className="settings-panel">
          <div className="settings-panel__header">
            <h3>Dashboard Sections</h3>
            <div className="settings-panel__actions">
              <button className="btn btn--sm btn--outline" onClick={() => setAllSections(true)}>
                Show All
              </button>
              <button className="btn btn--sm btn--outline" onClick={() => setAllSections(false)}>
                Hide All
              </button>
            </div>
          </div>
          <div className="settings-panel__grid">
            {groupNames.map((groupName) => {
              const orderedIds = getGroupOrder(groupName);
              return (
                <div key={groupName} className="settings-panel__group">
                  <h4 className="settings-panel__group-label">{groupName}</h4>
                  {orderedIds.map((sectionId, idx) => {
                    const section = sectionById[sectionId];
                    if (!section) return null;
                    return (
                      <div key={section.id} className="settings-panel__item">
                        <label className="settings-panel__item-left">
                          <input
                            type="checkbox"
                            checked={visibility[section.id] !== false}
                            onChange={() => toggleSection(section.id)}
                          />
                          {visibility[section.id] !== false
                            ? <Eye size={14} className="settings-panel__icon--on" />
                            : <EyeOff size={14} className="settings-panel__icon--off" />
                          }
                          <span>{section.label}</span>
                        </label>
                        {orderedIds.length > 1 && (
                          <div className="settings-panel__arrows">
                            <button
                              className="settings-panel__arrow-btn"
                              disabled={idx === 0}
                              onClick={() => moveSection(groupName, idx, -1)}
                              title="Move up"
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button
                              className="settings-panel__arrow-btn"
                              disabled={idx === orderedIds.length - 1}
                              onClick={() => moveSection(groupName, idx, 1)}
                              title="Move down"
                            >
                              <ChevronDown size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter bar: center + location scope */}
      {hasData && (centers.length > 1 || hasUsData) && (
        <div className="filter-bar">
          {centers.length > 1 && (
            <>
              <label htmlFor="center-filter">Center:</label>
              <select
                id="center-filter"
                value={selectedCenter}
                onChange={(e) => setSelectedCenter(e.target.value)}
                className="filter-select"
              >
                <option value="">All Centers</option>
                {centers.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </>
          )}
          {hasUsData && (
            <>
              <label htmlFor="scope-filter" style={{ marginLeft: centers.length > 1 ? 16 : 0 }}>
                Scope:
              </label>
              <div className="scope-toggle" role="group" aria-label="Location scope">
                <button
                  type="button"
                  className={`scope-toggle__btn ${locationScope === 'all' ? 'scope-toggle__btn--active' : ''}`}
                  onClick={() => setLocationScope('all')}
                >
                  All Locations
                </button>
                <button
                  type="button"
                  className={`scope-toggle__btn ${locationScope === 'excludeUs' ? 'scope-toggle__btn--active' : ''}`}
                  onClick={() => setLocationScope('excludeUs')}
                >
                  Mozambique Only
                </button>
                <button
                  type="button"
                  className={`scope-toggle__btn ${locationScope === 'usOnly' ? 'scope-toggle__btn--active' : ''}`}
                  onClick={() => setLocationScope('usOnly')}
                >
                  US Only
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
           Sections rendered in user-defined order per group
         ══════════════════════════════════════════════ */}

      {/* ── Full Year Outlook (YTD Actual + Budgeted Remaining) ── */}
      {show('fullYearOutlook') && outlookRows.length > 0 && (
        <div className="section full-year-outlook">
          <h3 className="section__title">
            <TrendingUp size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Full Year Outlook {year && `— ${year}`}
          </h3>
          <p className="full-year-outlook__subtitle">
            {maxActualMonths > 0
              ? `Actuals through ${MONTHS[maxActualMonths - 1]} ${year || ''} plus budgeted spend for the remainder of the year.`
              : 'Outlook based on annual budget (no actuals uploaded yet).'}
          </p>
          <div className="fin-table-scroll">
            <table className="fin-table full-year-outlook__table">
              <thead>
                <tr>
                  <th className="fin-table__category">Category</th>
                  <th>{ytdLabel}</th>
                  <th>{remainingLabel}</th>
                  <th>Full Year Outlook</th>
                  <th>Full Year Budget</th>
                  <th>Variance $</th>
                  <th>Variance %</th>
                </tr>
              </thead>
              <tbody>
                {outlookRows.map((r) => {
                  const overBudget = r.variance > 0;
                  const varClass = overBudget ? 'unfavorable' : 'favorable';
                  return (
                    <tr key={r.id}>
                      <td className="fin-table__category">{r.name}</td>
                      <td>{format(r.ytdActual)}</td>
                      <td>{format(r.budgetRemaining)}</td>
                      <td><strong>{format(r.outlook)}</strong></td>
                      <td>{format(r.budgetAnnual)}</td>
                      <td className={varClass}>
                        {overBudget ? '+' : ''}{format(r.variance)}
                      </td>
                      <td className={varClass}>
                        {(r.variancePct * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="fin-table__total-row">
                  <td className="fin-table__category"><strong>Total</strong></td>
                  <td><strong>{format(outlookTotals.ytdActual)}</strong></td>
                  <td><strong>{format(outlookTotals.budgetRemaining)}</strong></td>
                  <td><strong>{format(outlookTotals.outlook)}</strong></td>
                  <td><strong>{format(outlookTotals.budgetAnnual)}</strong></td>
                  <td className={outlookTotals.variance > 0 ? 'unfavorable' : 'favorable'}>
                    <strong>{outlookTotals.variance > 0 ? '+' : ''}{format(outlookTotals.variance)}</strong>
                  </td>
                  <td className={outlookTotals.variance > 0 ? 'unfavorable' : 'favorable'}>
                    <strong>{(outlookTotals.variancePct * 100).toFixed(1)}%</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── YoY Quarterly Comparison ── */}
      {show('yoyQuarterly') && hasYoyData && (
        <div className="section yoy-quarterly">
          <h3 className="section__title">
            <TrendingUp size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Year-over-Year Quarterly Comparison
            {priorYear && actualsYear && ` — ${priorYear} vs ${actualsYear}`}
          </h3>
          <p className="yoy-quarterly__subtitle">
            Prior year quarters are actuals. Current year quarters are actuals where available,
            budget for months not yet reported. Negative YoY means spending is down vs last year.
          </p>
          <div className="fin-table-scroll">
            <table className="fin-table yoy-quarterly__table">
              <thead>
                <tr>
                  <th rowSpan={2} className="fin-table__category">Category</th>
                  <th colSpan={5} className="yoy-quarterly__group yoy-quarterly__group--py">
                    {priorYear || 'Prior Year'} (Actual)
                  </th>
                  <th colSpan={5} className="yoy-quarterly__group yoy-quarterly__group--cy">
                    {actualsYear || 'Current Year'} (Actual + Budget)
                  </th>
                  <th colSpan={2} className="yoy-quarterly__group yoy-quarterly__group--yoy">
                    YoY Change
                  </th>
                </tr>
                <tr>
                  <th>Q1</th>
                  <th>Q2</th>
                  <th>Q3</th>
                  <th>Q4</th>
                  <th>Total</th>
                  <th>Q1</th>
                  <th>Q2</th>
                  <th>Q3</th>
                  <th>Q4</th>
                  <th>Total</th>
                  <th>$</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {yoyQuarterly.rows
                  .filter((r) => r.pyTotal !== 0 || r.cyTotal !== 0)
                  .map((r) => {
                    const down = r.yoyDollar < 0;
                    const varClass = down ? 'favorable' : 'unfavorable';
                    return (
                      <tr key={r.id}>
                        <td className="fin-table__category">{r.name}</td>
                        {r.pyQ.map((v, i) => <td key={`py${i}`}>{format(v)}</td>)}
                        <td><strong>{format(r.pyTotal)}</strong></td>
                        {r.cyQ.map((v, i) => <td key={`cy${i}`}>{format(v)}</td>)}
                        <td><strong>{format(r.cyTotal)}</strong></td>
                        <td className={varClass}>
                          {down ? '' : '+'}{format(r.yoyDollar)}
                        </td>
                        <td className={varClass}>
                          {r.pyTotal !== 0 ? `${(r.yoyPct * 100).toFixed(1)}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot>
                <tr className="fin-table__total-row">
                  <td className="fin-table__category"><strong>Total</strong></td>
                  {yoyQuarterly.totals.pyQ.map((v, i) => (
                    <td key={`ptot${i}`}><strong>{format(v)}</strong></td>
                  ))}
                  <td><strong>{format(yoyQuarterly.totals.pyTotal)}</strong></td>
                  {yoyQuarterly.totals.cyQ.map((v, i) => (
                    <td key={`ctot${i}`}><strong>{format(v)}</strong></td>
                  ))}
                  <td><strong>{format(yoyQuarterly.totals.cyTotal)}</strong></td>
                  <td className={yoyQuarterly.totals.yoyDollar < 0 ? 'favorable' : 'unfavorable'}>
                    <strong>
                      {yoyQuarterly.totals.yoyDollar < 0 ? '' : '+'}
                      {format(yoyQuarterly.totals.yoyDollar)}
                    </strong>
                  </td>
                  <td className={yoyQuarterly.totals.yoyDollar < 0 ? 'favorable' : 'unfavorable'}>
                    <strong>
                      {yoyQuarterly.totals.pyTotal !== 0
                        ? `${(yoyQuarterly.totals.yoyPct * 100).toFixed(1)}%`
                        : '—'}
                    </strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Monthly Business Review ── */}
      {(show('monthlyKpis') || show('monthlyBridge') || show('monthlyDetail')) && reviewMonthIdx >= 0 && (
        <div className="monthly-review">
          <div className="monthly-review__header">
            <h3 className="section__title">
              <Calendar size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Monthly Business Review — {reviewMonthLabel} {reviewActualsYear}
            </h3>
            <select
              className="filter-select"
              value={reviewMonthIdx}
              onChange={(e) => setSelectedMonthIdx(Number(e.target.value))}
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {MONTHS[m]} {reviewActualsYear}
                  {m === lastActualIdx ? ' (latest)' : ''}
                </option>
              ))}
            </select>
          </div>

          {getGroupOrder('Monthly Review').map((id) => {
            if (id === 'monthlyKpis' && show('monthlyKpis')) {
              return (
                <div key={id} className="kpi-grid" style={{ marginTop: 16 }}>
                  <KpiCard
                    title={`${reviewMonthLabel} Expenses`}
                    amount={mMonthExpTotal}
                    icon={TrendingDown}
                    type="expense"
                    comparisons={[
                      { label: 'vs Budget', value: variance(mMonthExpTotal, mMonthBudgetTotal), pct: variancePct(mMonthExpTotal, mMonthBudgetTotal), favorable: mMonthExpTotal <= mMonthBudgetTotal },
                      { label: `vs ${reviewMonthLabel} ${reviewPriorYr}`, value: variance(mMonthExpTotal, mMonthPriorTotal), pct: variancePct(mMonthExpTotal, mMonthPriorTotal), favorable: mMonthExpTotal <= mMonthPriorTotal },
                    ]}
                  />
                  {activeRevenue.length > 0 && (
                    <KpiCard
                      title={`${reviewMonthLabel} Revenue`}
                      amount={mMonthRev}
                      icon={TrendingUp}
                      type="revenue"
                      comparisons={[
                        { label: 'vs Budget', value: variance(mMonthRev, mMonthRevBudget), pct: variancePct(mMonthRev, mMonthRevBudget), favorable: mMonthRev >= mMonthRevBudget },
                        { label: `vs ${reviewMonthLabel} ${reviewPriorYr}`, value: variance(mMonthRev, mMonthRevPrior), pct: variancePct(mMonthRev, mMonthRevPrior), favorable: mMonthRev >= mMonthRevPrior },
                      ]}
                    />
                  )}
                  {activeRevenue.length > 0 && (
                    <KpiCard
                      title={`${reviewMonthLabel} Net`}
                      amount={mMonthNet}
                      icon={DollarSign}
                      type={mMonthNet >= 0 ? 'revenue' : 'expense'}
                      comparisons={[
                        { label: 'Revenue', value: mMonthRev },
                        { label: 'Expenses', value: -mMonthExpTotal },
                      ]}
                    />
                  )}
                </div>
              );
            }
            if (id === 'monthlyBridge' && show('monthlyBridge') && (bridgeData || yoyBridgeData)) {
              return (
                <div key={id} className="bridge" style={{ marginTop: 16 }}>
                  <h3 className="fin-table__title">
                    {reviewMonthLabel} {reviewActualsYear} — Expense Bridges
                  </h3>
                  {(() => {
                    const allNotes = monthlyExpDetail
                      .filter((r) => r.notes && r.notes.length > 0)
                      .map((r) => ({ name: r.name, notes: r.notes }));
                    if (allNotes.length === 0) return null;
                    return (
                      <div className="bridge__notes">
                        <h4 className="bridge__notes-title">Notes</h4>
                        <ul className="bridge__notes-list">
                          {allNotes.map((item) =>
                            item.notes.map((note, ni) => (
                              <li key={`${item.name}-${ni}`}>
                                <strong>{note.lineItem || item.name}{note.lineItem ? ` in the ${item.name} category` : ''}, ({format(note.amount)}):</strong> {note.text}
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    );
                  })()}
                  <div className="bridge__grid">
                    {bridgeData && (
                      <div className="bridge__column">
                        <h4 className="bridge__subtitle">vs Budget</h4>
                        <div className="bridge__narrative"><p>{bridgeData.narrative}</p></div>
                        <div className="fin-table-scroll">
                          <table className="fin-table bridge__table">
                            <thead><tr><th className="fin-table__category">Item</th><th className="bridge__amount">Amount</th></tr></thead>
                            <tbody>
                              <tr className="bridge__row bridge__row--anchor"><td className="fin-table__category"><strong>Budgeted Expenses</strong></td><td className="bridge__amount"><strong>{format(bridgeData.baseTotal)}</strong></td></tr>
                              {bridgeData.rows.map((row) => (
                                <tr key={row.name} className={`bridge__row ${row.variance > 0 ? 'bridge__row--over' : 'bridge__row--under'}`}>
                                  <td className="fin-table__category bridge__indent">{row.name}</td>
                                  <td className={`bridge__amount ${row.variance > 0 ? 'unfavorable' : 'favorable'}`}>{row.variance > 0 ? '+' : ''}{format(row.variance)}</td>
                                </tr>
                              ))}
                              <tr className="bridge__row bridge__row--anchor bridge__row--total"><td className="fin-table__category"><strong>Actual Expenses</strong></td><td className="bridge__amount"><strong>{format(bridgeData.actualTotal)}</strong></td></tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {yoyBridgeData && (
                      <div className="bridge__column">
                        <h4 className="bridge__subtitle">vs Prior Year ({reviewPriorYr})</h4>
                        <div className="bridge__narrative"><p>{yoyBridgeData.narrative}</p></div>
                        <div className="fin-table-scroll">
                          <table className="fin-table bridge__table">
                            <thead><tr><th className="fin-table__category">Item</th><th className="bridge__amount">Amount</th></tr></thead>
                            <tbody>
                              <tr className="bridge__row bridge__row--anchor"><td className="fin-table__category"><strong>{reviewMonthLabel} {reviewPriorYr} Expenses</strong></td><td className="bridge__amount"><strong>{format(yoyBridgeData.baseTotal)}</strong></td></tr>
                              {yoyBridgeData.rows.map((row) => (
                                <tr key={row.name} className={`bridge__row ${row.variance > 0 ? 'bridge__row--over' : 'bridge__row--under'}`}>
                                  <td className="fin-table__category bridge__indent">{row.name}</td>
                                  <td className={`bridge__amount ${row.variance > 0 ? 'unfavorable' : 'favorable'}`}>{row.variance > 0 ? '+' : ''}{format(row.variance)}</td>
                                </tr>
                              ))}
                              <tr className="bridge__row bridge__row--anchor bridge__row--total"><td className="fin-table__category"><strong>Actual Expenses</strong></td><td className="bridge__amount"><strong>{format(yoyBridgeData.actualTotal)}</strong></td></tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            if (id === 'monthlyDetail' && show('monthlyDetail') && monthlyExpDetail.length > 0) {
              return (
                <div key={id} className="fin-table-container" style={{ marginTop: 16 }}>
                  <h3 className="fin-table__title">{reviewMonthLabel} {reviewActualsYear} — Expenses by Category</h3>
                  <div className="fin-table-scroll">
                    <table className="fin-table">
                      <thead>
                        <tr>
                          <th className="fin-table__category">Category</th>
                          <th>Actual</th><th>Budget</th><th>Var ($)</th><th>Var (%)</th>
                          <th>{reviewMonthLabel} {reviewPriorYr}</th><th>YoY ($)</th><th>YoY (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyExpDetail.filter((r) => r.actual !== null || r.budget > 0).map((row) => (
                          <tr key={row.id}>
                            <td className="fin-table__category">{row.name}</td>
                            <td>{row.actual !== null ? format(row.actual) : '—'}</td>
                            <td>{format(row.budget)}</td>
                            <td className={row.budgetVar !== null ? (row.budgetVar <= 0 ? 'favorable' : 'unfavorable') : ''}>{row.budgetVar !== null ? format(row.budgetVar) : '—'}</td>
                            <td className={row.budgetVarPct !== null ? (row.budgetVarPct <= 0 ? 'favorable' : 'unfavorable') : ''}>{row.budgetVarPct !== null ? `${row.budgetVarPct > 0 ? '+' : ''}${row.budgetVarPct.toFixed(1)}%` : '—'}</td>
                            <td>{format(row.prior)}</td>
                            <td className={row.priorVar !== null ? (row.priorVar <= 0 ? 'favorable' : 'unfavorable') : ''}>{row.priorVar !== null ? format(row.priorVar) : '—'}</td>
                            <td className={row.priorVarPct !== null ? (row.priorVarPct <= 0 ? 'favorable' : 'unfavorable') : ''}>{row.priorVarPct !== null ? `${row.priorVarPct > 0 ? '+' : ''}${row.priorVarPct.toFixed(1)}%` : '—'}</td>
                          </tr>
                        ))}
                        <tr className="fin-table__total-row">
                          <td className="fin-table__category"><strong>Total</strong></td>
                          <td><strong>{format(mMonthExpTotal)}</strong></td>
                          <td><strong>{format(mMonthBudgetTotal)}</strong></td>
                          <td className={mMonthExpTotal <= mMonthBudgetTotal ? 'favorable' : 'unfavorable'}><strong>{format(mMonthExpTotal - mMonthBudgetTotal)}</strong></td>
                          <td className={mMonthExpTotal <= mMonthBudgetTotal ? 'favorable' : 'unfavorable'}><strong>{mMonthBudgetTotal ? `${variancePct(mMonthExpTotal, mMonthBudgetTotal).toFixed(1)}%` : '—'}</strong></td>
                          <td><strong>{format(mMonthPriorTotal)}</strong></td>
                          <td className={mMonthExpTotal <= mMonthPriorTotal ? 'favorable' : 'unfavorable'}><strong>{format(mMonthExpTotal - mMonthPriorTotal)}</strong></td>
                          <td className={mMonthExpTotal <= mMonthPriorTotal ? 'favorable' : 'unfavorable'}><strong>{mMonthPriorTotal ? `${variancePct(mMonthExpTotal, mMonthPriorTotal).toFixed(1)}%` : '—'}</strong></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      {/* ── KPI Cards group (rendered in order) ── */}
      {(() => {
        const kpiOrder = getGroupOrder('KPI Cards');
        const kpiCardIds = new Set(['kpiRevenue', 'kpiExpenses', 'kpiNet', 'kpiBudget']);
        const elements = [];
        let pendingCards = [];

        const renderKpiCard = (cardId) => {
          if (cardId === 'kpiRevenue' && show('kpiRevenue') && activeRevenue.length > 0)
            return <KpiCard key={cardId} title="YTD Revenue" amount={revActual} icon={TrendingUp} type="revenue" comparisons={[{ label: 'vs Budget', value: variance(revActual, revBudget), pct: variancePct(revActual, revBudget), favorable: revActual >= revBudget }, { label: 'vs Prior Year', value: variance(revActual, revPrior), pct: variancePct(revActual, revPrior), favorable: revActual >= revPrior }]} />;
          if (cardId === 'kpiExpenses' && show('kpiExpenses') && expenseCategories.length > 0)
            return <KpiCard key={cardId} title="YTD Total Expenses" amount={totalExpActual} icon={TrendingDown} type="expense" comparisons={[{ label: 'vs Budget', value: variance(totalExpActual, totalExpBudget), pct: variancePct(totalExpActual, totalExpBudget), favorable: totalExpActual <= totalExpBudget }, { label: 'vs Prior Year', value: variance(totalExpActual, totalExpPrior), pct: variancePct(totalExpActual, totalExpPrior), favorable: totalExpActual <= totalExpPrior }]} />;
          if (cardId === 'kpiNet' && show('kpiNet') && (activeRevenue.length > 0 || expenseCategories.length > 0))
            return <KpiCard key={cardId} title="YTD Net Position" amount={netActual} icon={DollarSign} type={netActual >= 0 ? 'revenue' : 'expense'} comparisons={[{ label: 'vs Budget', value: variance(netActual, netBudget), pct: variancePct(netActual, netBudget), favorable: netActual >= netBudget }, { label: 'vs Prior Year', value: variance(netActual, netPrior), pct: variancePct(netActual, netPrior), favorable: netActual >= netPrior }]} />;
          if (cardId === 'kpiBudget' && show('kpiBudget') && totalExpAnnual > 0)
            return <KpiCard key={cardId} title="Annual Expense Budget" amount={totalExpAnnual} icon={PieChartIcon} type="neutral" comparisons={[{ label: 'Used YTD', value: totalExpActual, pct: totalExpAnnual > 0 ? variancePct(totalExpActual, totalExpAnnual) : 0 }]} />;
          return null;
        };

        const flushCards = () => {
          const visible = pendingCards.filter(Boolean);
          if (visible.length > 0) elements.push(<div key={`kpi-grid-${elements.length}`} className="kpi-grid">{visible}</div>);
          pendingCards = [];
        };

        for (const id of kpiOrder) {
          if (id === 'restrictedFunds') {
            flushCards();
            if (show('restrictedFunds') && activeRestricted.length > 0 && restrictedActual > 0) {
              elements.push(
                <div key={id} className="restricted-funds-callout">
                  <div className="restricted-funds-callout__icon"><Info size={18} /></div>
                  <div className="restricted-funds-callout__content">
                    <h4 className="restricted-funds-callout__title">Designated Funds — For Information Only</h4>
                    <p className="restricted-funds-callout__desc">The following are separate projects and are <strong>not</strong> included in operating revenue or net position.</p>
                    <div className="restricted-funds-callout__items">
                      {activeRestricted.map((cat) => {
                        const catYtd = ytdTotal([cat]);
                        const catPrior = ytdPriorYearTotal([cat]);
                        return (
                          <div key={cat.id} className="restricted-funds-callout__item">
                            <span className="restricted-funds-callout__name">{cat.name}</span>
                            <span className="restricted-funds-callout__amount">{format(catYtd)} YTD</span>
                            {catPrior > 0 && <span className="restricted-funds-callout__prior">({format(catPrior)} prior year)</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }
          } else if (kpiCardIds.has(id)) {
            pendingCards.push(renderKpiCard(id));
          }
        }
        flushCards();
        return elements;
      })()}

      {/* ── Charts group (rendered in order) ── */}
      {(() => {
        const chartOrder = getGroupOrder('Charts');
        const elements = [];
        let chartBatch = [];

        const flushCharts = () => {
          const visible = chartBatch.filter(Boolean);
          if (visible.length > 0) elements.push(<div key={`chart-grid-${elements.length}`} className="chart-grid">{visible}</div>);
          chartBatch = [];
        };

        for (const id of chartOrder) {
          if (id === 'timeline') {
            flushCharts();
            if (show('timeline') && timelineData.length > 0) {
              elements.push(
                <TimelineChart key={id} title="Expense Timeline: Prior Year Actuals → Current Actuals → Forward Budget" data={timelineData} actualsYear={actualsYear} budgetYear={budgetYear} priorYear={priorYear} />
              );
            }
          } else if (id === 'pieBreakdown' && show('pieBreakdown') && pieData.length > 0) {
            chartBatch.push(
              <div key={id} className="chart-container">
                <h3 className="chart__title">Program Breakdown (YTD)</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine>
                      {pieData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                    </Pie>
                    <Tooltip formatter={(value) => format(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            );
          } else if (id === 'chartRevenue' && show('chartRevenue') && revenueChartData.length > 0) {
            chartBatch.push(<MonthlyChart key={id} title="Revenue: Actual vs Prior Year" data={revenueChartData} actualsYear={revActualsYr} budgetYear={null} priorYear={revPriorYr} />);
          } else if (id === 'chartExpense' && show('chartExpense') && expenseChartData.length > 0) {
            chartBatch.push(<MonthlyChart key={id} title="Expenses: Actual vs Prior Year" data={expenseChartData} actualsYear={actualsYear} budgetYear={budgetYear} priorYear={priorYear} />);
          }
        }
        flushCharts();
        return elements;
      })()}

      {/* ── Tables group (rendered in order) ── */}
      {getGroupOrder('Tables').map((id) => {
        if (id === 'tableExpenses' && show('tableExpenses') && expRows.length > 0)
          return <FinancialTable key={id} title="All Expenses by Category" rows={expRows} isRevenue={false} />;
        if (id === 'tableRevenue' && show('tableRevenue') && revenueRows.length > 0)
          return <FinancialTable key={id} title="Revenue Detail (All Sources)" rows={revenueRows} isRevenue restrictedIds={activeRestricted.map((c) => c.id)} />;
        return null;
      })}

      {/* ── Budget Progress group (rendered in order) ── */}
      {getGroupOrder('Budget Progress').map((id) => {
        if (id === 'budgetExpenses' && show('budgetExpenses') && expenseCategories.length > 0)
          return (
            <div key={id} className="section">
              <h3 className="section__title">Annual Budget Utilization — Expenses</h3>
              {expenseCategories.filter((cat) => cat.budgetAnnual > 0).map((cat) => {
                const rows = buildCategorySummary([cat]);
                return <BudgetProgressBar key={cat.id} label={cat.name} actual={rows[0].ytdActual} budget={cat.budgetAnnual} priorYear={rows[0].fullPrior} monthsCompleted={maxActualMonths} />;
              })}
            </div>
          );
        if (id === 'budgetRevenue' && show('budgetRevenue') && allRevenue.length > 0)
          return (
            <div key={id} className="section">
              <h3 className="section__title">Annual Budget Utilization — Revenue</h3>
              {allRevenue.filter((cat) => cat.budgetAnnual > 0).map((cat) => {
                const rows = buildCategorySummary([cat]);
                return <BudgetProgressBar key={cat.id} label={cat.name} actual={rows[0].ytdActual} budget={cat.budgetAnnual} priorYear={rows[0].fullPrior} monthsCompleted={maxActualMonths} />;
              })}
            </div>
          );
        return null;
      })}
    </div>
  );
}
