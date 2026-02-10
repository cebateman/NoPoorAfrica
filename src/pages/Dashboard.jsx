import { useState, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
  Settings,
  Eye,
  EyeOff,
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
  usCategories,
  usRevenue,
  usLeadership,
  mzLeadership,
  MONTHS,
  FISCAL_YEAR,
} from '../data/financialData';
import { useData } from '../data/DataContext';
import { useCurrency } from '../data/CurrencyContext';
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
} from '../utils/calculations';
import KpiCard from '../components/KpiCard';
import FinancialTable from '../components/FinancialTable';
import MonthlyChart from '../components/MonthlyChart';
import BudgetProgressBar from '../components/BudgetProgressBar';
import TimelineChart from '../components/TimelineChart';
import LeadershipList from '../components/LeadershipList';

const PIE_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#be185d', '#65a30d'];

// ── Dashboard section definitions ──
const SECTIONS = [
  { id: 'kpiRevenue',     label: 'KPI: YTD Revenue',             group: 'KPI Cards' },
  { id: 'kpiExpenses',    label: 'KPI: YTD Expenses',            group: 'KPI Cards' },
  { id: 'kpiNet',         label: 'KPI: Net Position',            group: 'KPI Cards' },
  { id: 'kpiBudget',      label: 'KPI: Annual Budget',           group: 'KPI Cards' },
  { id: 'timeline',       label: 'Expense Timeline (full width)', group: 'Charts' },
  { id: 'pieExpenseSplit', label: 'Pie: MZ vs US Expense Split',  group: 'Charts' },
  { id: 'pieMzBreakdown', label: 'Pie: MZ Program Breakdown',    group: 'Charts' },
  { id: 'chartRevenue',   label: 'Revenue Bar Chart',            group: 'Charts' },
  { id: 'chartMzExpense', label: 'MZ Expense Bar Chart',         group: 'Charts' },
  { id: 'tableExpenses',  label: 'Expense Table',                group: 'Tables' },
  { id: 'tableRevenue',   label: 'Revenue Table',                group: 'Tables' },
  { id: 'budgetMz',       label: 'Budget Progress: MZ',          group: 'Budget Progress' },
  { id: 'budgetUs',       label: 'Budget Progress: US',          group: 'Budget Progress' },
  { id: 'budgetRevenue',  label: 'Budget Progress: Revenue',     group: 'Budget Progress' },
  { id: 'leadership',     label: 'Leadership Lists',             group: 'Other' },
];

const ALL_SECTION_IDS = SECTIONS.map((s) => s.id);
const STORAGE_KEY = 'npa_dashboard_sections';

function loadSectionVisibility() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults — new sections default to visible
      const result = {};
      ALL_SECTION_IDS.forEach((id) => {
        result[id] = parsed[id] !== undefined ? parsed[id] : true;
      });
      return result;
    }
  } catch { /* noop */ }
  // Default: all visible
  const result = {};
  ALL_SECTION_IDS.forEach((id) => { result[id] = true; });
  return result;
}

function saveSectionVisibility(visibility) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
  } catch { /* noop */ }
}

// US expense categories tagged with location
const US_EXPENSE_CATEGORIES = [
  {
    id: 'us_travel',
    name: 'Travel & Field Visits',
    location: 'US',
    budgetAnnual: 18000,
    budgetMonthly: [1000, 1000, 2000, 1500, 1500, 2000, 1500, 1500, 2000, 1500, 1500, 1500],
    actualMonthly: [800],
    priorYearMonthly: [900, 1100, 1800, 1400, 1200, 1900, 1300, 1400, 1700, 1200, 1400, 1500],
  },
  {
    id: 'us_salaries',
    name: 'US Staff & Admin',
    location: 'US',
    budgetAnnual: 62000,
    budgetMonthly: [5200, 5200, 5200, 5200, 5200, 5000, 5000, 5200, 5200, 5200, 5200, 5000],
    actualMonthly: [5400],
    priorYearMonthly: [4800, 4900, 5000, 4900, 5100, 4800, 4700, 5000, 5100, 4900, 5000, 4800],
  },
  {
    id: 'us_fundraising',
    name: 'Fundraising & Development',
    location: 'US',
    budgetAnnual: 85000,
    budgetMonthly: [7000, 7000, 7500, 7000, 7000, 7500, 7000, 7000, 7500, 7000, 7000, 7500],
    actualMonthly: [6800],
    priorYearMonthly: [6200, 6500, 7100, 6400, 6800, 7200, 6600, 6900, 7400, 6500, 6700, 7100],
  },
  {
    id: 'us_comms',
    name: 'Communications & Website',
    location: 'US',
    budgetAnnual: 28000,
    budgetMonthly: [2500, 2500, 2500, 2000, 2000, 2000, 2500, 2500, 2500, 2000, 2500, 2500],
    actualMonthly: [2300],
    priorYearMonthly: [2000, 2100, 2200, 1800, 1900, 2000, 2100, 2200, 2300, 1900, 2100, 2200],
  },
];

export default function Dashboard() {
  const {
    hasData, hasRevenue, revenueCategories, allCategories, centers,
    getCategoriesForCenter, dataYears, actualsYear, priorYear, budgetYear,
    revenueCurrentYear, revenuePriorYear,
  } = useData();
  const { format } = useCurrency();
  const [selectedCenter, setSelectedCenter] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [visibility, setVisibility] = useState(loadSectionVisibility);

  const show = (id) => visibility[id] !== false;

  const toggleSection = useCallback((id) => {
    setVisibility((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveSectionVisibility(next);
      return next;
    });
  }, []);

  const setAllSections = useCallback((value) => {
    const next = {};
    ALL_SECTION_IDS.forEach((id) => { next[id] = value; });
    saveSectionVisibility(next);
    setVisibility(next);
  }, []);

  // Revenue: use uploaded data when available, otherwise hardcoded
  const activeRevenue = hasRevenue ? revenueCategories : usRevenue;

  // Mozambique categories from uploaded data or defaults
  const mzCategories = hasData
    ? (selectedCenter ? getCategoriesForCenter(selectedCenter) : allCategories)
    : [];

  // Tag MZ categories with location
  const taggedMzCategories = mzCategories.map((cat) => ({
    ...cat,
    location: 'MZ',
  }));

  // Combined expense categories: US + MZ
  const allExpenseCategories = [...US_EXPENSE_CATEGORIES, ...taggedMzCategories];

  const year = hasData && dataYears.length > 0 ? dataYears[dataYears.length - 1] : FISCAL_YEAR;

  // Determine data months
  const maxMzActualMonths = mzCategories.reduce(
    (max, cat) => Math.max(max, (cat.actualMonthly || []).length),
    0,
  );
  const mzMonthLabel = maxMzActualMonths > 0 ? MONTHS[maxMzActualMonths - 1] : null;

  // ── Revenue ──
  const revActual = ytdTotal(activeRevenue);
  const revBudget = ytdBudgetTotal(activeRevenue);
  const revPrior = ytdPriorYearTotal(activeRevenue);
  const revAnnual = fullYearBudgetTotal(activeRevenue);

  // ── Total Expenses ──
  const usExpActual = ytdTotal(US_EXPENSE_CATEGORIES);
  const usExpBudget = ytdBudgetTotal(US_EXPENSE_CATEGORIES);
  const usExpPrior = ytdPriorYearTotal(US_EXPENSE_CATEGORIES);

  const mzExpActual = ytdTotal(mzCategories);
  const mzExpBudget = ytdBudgetTotal(mzCategories);
  const mzExpPrior = ytdPriorYearTotal(mzCategories);

  const totalExpActual = usExpActual + mzExpActual;
  const totalExpBudget = usExpBudget + mzExpBudget;
  const totalExpPrior = usExpPrior + mzExpPrior;
  const totalExpAnnual = fullYearBudgetTotal(US_EXPENSE_CATEGORIES) + fullYearBudgetTotal(mzCategories);

  // Net
  const netActual = revActual - totalExpActual;
  const netBudget = revBudget - totalExpBudget;
  const netPrior = revPrior - totalExpPrior;

  // ── Table rows with location tags ──
  const revenueRows = buildCategorySummary(activeRevenue);
  const usExpRows = buildCategorySummary(US_EXPENSE_CATEGORIES).map((r) => ({ ...r, location: 'US' }));
  const mzExpRows = buildCategorySummary(mzCategories).map((r) => ({ ...r, location: 'MZ' }));
  const allExpRows = [...mzExpRows, ...usExpRows];

  // ── Charts ──
  const revActualsYr = hasRevenue ? revenueCurrentYear : FISCAL_YEAR;
  const revPriorYr = hasRevenue ? revenuePriorYear : FISCAL_YEAR - 1;
  const revBudgetYr = hasRevenue ? null : FISCAL_YEAR;

  const revenueChartData = buildMonthlyComparison(activeRevenue, MONTHS, {
    actualsYear: revActualsYr, budgetYear: revBudgetYr, priorYear: revPriorYr,
  });

  const mzExpenseChartData = mzCategories.length > 0
    ? buildMonthlyComparison(mzCategories, MONTHS, {
        actualsYear: actualsYear, budgetYear: budgetYear, priorYear: priorYear,
      })
    : [];

  // ── Timeline ──
  const mzTimelineData = mzCategories.length > 0
    ? buildTimelineData(mzCategories, MONTHS, {
        actualsYear: actualsYear, budgetYear: budgetYear, priorYear: priorYear,
      })
    : [];

  // ── Pie data ──
  const mzPieData = mzCategories
    .map((cat) => ({ name: cat.name, value: ytdTotal([cat]) }))
    .filter((d) => d.value > 0);

  const splitPieData = [
    { name: 'Mozambique Programs', value: mzExpActual },
    { name: 'US Operations', value: usExpActual },
  ].filter((d) => d.value > 0);

  // Group sections for the settings panel
  const groups = {};
  SECTIONS.forEach((s) => {
    if (!groups[s.group]) groups[s.group] = [];
    groups[s.group].push(s);
  });

  const visibleCount = ALL_SECTION_IDS.filter((id) => visibility[id]).length;

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <div className="dashboard__header-top">
          <h2>
            <BarChart3 size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            No Poor Africa — FY {year}
          </h2>
          <button
            className="btn btn--outline btn--settings"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings size={14} />
            Customize ({visibleCount}/{ALL_SECTION_IDS.length})
          </button>
        </div>
        <p className="dashboard__subtitle">
          Financial Leadership Dashboard
          {mzMonthLabel && <> &middot; MZ data through {mzMonthLabel} {year}</>}
          {' '}&middot; US data through January {FISCAL_YEAR}
        </p>
      </div>

      {/* ── Settings Panel ── */}
      {showSettings && (
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
            {Object.entries(groups).map(([groupName, items]) => (
              <div key={groupName} className="settings-panel__group">
                <h4 className="settings-panel__group-label">{groupName}</h4>
                {items.map((section) => (
                  <label key={section.id} className="settings-panel__item">
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
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Center filter */}
      {hasData && centers.length > 1 && (
        <div className="filter-bar">
          <label htmlFor="center-filter">MZ Center:</label>
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
        </div>
      )}

      {/* ── KPI Cards ── */}
      {(show('kpiRevenue') || show('kpiExpenses') || show('kpiNet') || show('kpiBudget')) && (
        <div className="kpi-grid">
          {show('kpiRevenue') && (
            <KpiCard
              title="YTD Revenue"
              amount={revActual}
              icon={TrendingUp}
              type="revenue"
              comparisons={[
                { label: 'vs Budget', value: variance(revActual, revBudget), pct: variancePct(revActual, revBudget), favorable: revActual >= revBudget },
                { label: 'vs Prior Year', value: variance(revActual, revPrior), pct: variancePct(revActual, revPrior), favorable: revActual >= revPrior },
              ]}
            />
          )}
          {show('kpiExpenses') && (
            <KpiCard
              title="YTD Total Expenses"
              amount={totalExpActual}
              icon={TrendingDown}
              type="expense"
              comparisons={[
                { label: 'vs Budget', value: variance(totalExpActual, totalExpBudget), pct: variancePct(totalExpActual, totalExpBudget), favorable: totalExpActual <= totalExpBudget },
                { label: 'vs Prior Year', value: variance(totalExpActual, totalExpPrior), pct: variancePct(totalExpActual, totalExpPrior), favorable: totalExpActual <= totalExpPrior },
              ]}
            />
          )}
          {show('kpiNet') && (
            <KpiCard
              title="YTD Net Position"
              amount={netActual}
              icon={DollarSign}
              type={netActual >= 0 ? 'revenue' : 'expense'}
              comparisons={[
                { label: 'vs Budget', value: variance(netActual, netBudget), pct: variancePct(netActual, netBudget), favorable: netActual >= netBudget },
                { label: 'vs Prior Year', value: variance(netActual, netPrior), pct: variancePct(netActual, netPrior), favorable: netActual >= netPrior },
              ]}
            />
          )}
          {show('kpiBudget') && (
            <KpiCard
              title="Annual Expense Budget"
              amount={totalExpAnnual}
              icon={PieChartIcon}
              type="neutral"
              comparisons={[
                { label: 'MZ used', value: mzExpActual, pct: totalExpAnnual > 0 ? variancePct(mzExpActual, fullYearBudgetTotal(mzCategories) || 1) : 0 },
                { label: 'US used', value: usExpActual, pct: variancePct(usExpActual, fullYearBudgetTotal(US_EXPENSE_CATEGORIES)) },
              ]}
            />
          )}
        </div>
      )}

      {/* ── Full-width Timeline ── */}
      {show('timeline') && mzTimelineData.length > 0 && (
        <TimelineChart
          title="MZ Expense Timeline: Prior Year Actuals → Current Actuals → Forward Budget"
          data={mzTimelineData}
          actualsYear={actualsYear}
          budgetYear={budgetYear}
          priorYear={priorYear}
        />
      )}

      {/* ── Expense Split + MZ Breakdown Pies ── */}
      {(show('pieExpenseSplit') || show('pieMzBreakdown')) && splitPieData.length > 0 && (
        <div className="chart-grid">
          {show('pieExpenseSplit') && (
            <div className="chart-container">
              <h3 className="chart__title">Expense Split: Mozambique vs US (YTD)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={splitPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine>
                    <Cell fill="#2563eb" />
                    <Cell fill="#94a3b8" />
                  </Pie>
                  <Tooltip formatter={(value) => format(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {show('pieMzBreakdown') && mzPieData.length > 0 && (
            <div className="chart-container">
              <h3 className="chart__title">Mozambique Program Breakdown (YTD)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={mzPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine>
                    {mzPieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => format(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Bar Charts ── */}
      {(show('chartRevenue') || show('chartMzExpense')) && (
        <div className="chart-grid">
          {show('chartRevenue') && (
            <MonthlyChart
              title="Revenue: Actual vs Prior Year"
              data={revenueChartData}
              actualsYear={revActualsYr}
              budgetYear={revBudgetYr}
              priorYear={revPriorYr}
            />
          )}
          {show('chartMzExpense') && mzExpenseChartData.length > 0 && (
            <MonthlyChart
              title="MZ Expenses: Actual vs Prior Year"
              data={mzExpenseChartData}
              actualsYear={actualsYear}
              budgetYear={budgetYear}
              priorYear={priorYear}
            />
          )}
        </div>
      )}

      {/* ── Expense Table ── */}
      {show('tableExpenses') && (
        <FinancialTable
          title="All Expenses by Category"
          rows={allExpRows}
          isRevenue={false}
        />
      )}

      {/* ── Revenue Table ── */}
      {show('tableRevenue') && (
        <FinancialTable
          title={hasRevenue ? 'Revenue Detail' : 'Revenue Detail (US-based)'}
          rows={revenueRows}
          isRevenue
        />
      )}

      {/* ── Budget Progress: MZ ── */}
      {show('budgetMz') && mzCategories.length > 0 && (
        <div className="section">
          <h3 className="section__title">Annual Budget Utilization — Mozambique Programs</h3>
          {mzCategories.map((cat) => {
            const rows = buildCategorySummary([cat]);
            return (
              <BudgetProgressBar
                key={cat.id}
                label={cat.name}
                actual={rows[0].ytdActual}
                budget={cat.budgetAnnual}
                priorYear={rows[0].fullPrior}
                location="MZ"
              />
            );
          })}
        </div>
      )}

      {/* ── Budget Progress: US ── */}
      {show('budgetUs') && (
        <div className="section">
          <h3 className="section__title">Annual Budget Utilization — US Operations</h3>
          {US_EXPENSE_CATEGORIES.map((cat) => {
            const rows = buildCategorySummary([cat]);
            return (
              <BudgetProgressBar
                key={cat.id}
                label={cat.name}
                actual={rows[0].ytdActual}
                budget={cat.budgetAnnual}
                priorYear={rows[0].fullPrior}
                location="US"
              />
            );
          })}
        </div>
      )}

      {/* ── Budget Progress: Revenue ── */}
      {show('budgetRevenue') && (
        <div className="section">
          <h3 className="section__title">Annual Budget Utilization — Revenue</h3>
          {activeRevenue.map((cat) => {
            const rows = buildCategorySummary([cat]);
            return (
              <BudgetProgressBar
                key={cat.id}
                label={cat.name}
                actual={rows[0].ytdActual}
                budget={cat.budgetAnnual}
                priorYear={rows[0].fullPrior}
              />
            );
          })}
        </div>
      )}

      {/* ── Leadership ── */}
      {show('leadership') && (
        <div className="leadership-grid">
          <LeadershipList title="Mozambique Leadership" members={mzLeadership} />
          <LeadershipList title="US Leadership" members={usLeadership} />
        </div>
      )}
    </div>
  );
}
