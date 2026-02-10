import { useState, useCallback, useMemo } from 'react';
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
  { id: 'monthlyKpis',    label: 'Monthly KPI Cards',            group: 'Monthly Review' },
  { id: 'monthlyBridge',  label: 'Monthly Budget Bridge',         group: 'Monthly Review' },
  { id: 'monthlyDetail',  label: 'Monthly Category Breakdown',   group: 'Monthly Review' },
  { id: 'budgetExpenses', label: 'Budget Progress: Expenses',    group: 'Budget Progress' },
  { id: 'budgetRevenue',  label: 'Budget Progress: Revenue',     group: 'Budget Progress' },
];

const ALL_SECTION_IDS = SECTIONS.map((s) => s.id);
const STORAGE_KEY = 'npa_dashboard_sections';

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
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(null);

  const show = (id) => visibility[id] !== false;

  const handlePrint = useCallback(() => {
    // Stamp the print date for the CSS ::after footer
    const el = document.querySelector('.dashboard');
    if (el) el.setAttribute('data-print-date', new Date().toLocaleDateString());
    window.print();
  }, []);

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

  // Revenue from uploaded data
  const activeRevenue = hasRevenue ? revenueCategories : [];

  // Expense categories from uploaded data
  const expenseCategories = hasData
    ? (selectedCenter ? getCategoriesForCenter(selectedCenter) : allCategories)
    : [];

  const year = hasData && dataYears.length > 0 ? dataYears[dataYears.length - 1] : FISCAL_YEAR;

  // Determine data months
  const maxActualMonths = expenseCategories.reduce(
    (max, cat) => Math.max(max, (cat.actualMonthly || []).length),
    0,
  );
  const dataMonthLabel = maxActualMonths > 0 ? MONTHS[maxActualMonths - 1] : null;

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

  // Net
  const netActual = revActual - totalExpActual;
  const netBudget = revBudget - totalExpBudget;
  const netPrior = revPrior - totalExpPrior;

  // ── Table rows ──
  const revenueRows = buildCategorySummary(activeRevenue);
  const expRows = buildCategorySummary(expenseCategories);

  // ── Charts ──
  const revActualsYr = revenueCurrentYear;
  const revPriorYr = revenuePriorYear;

  const revenueChartData = activeRevenue.length > 0
    ? buildMonthlyComparison(activeRevenue, MONTHS, {
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

  const mMonthNet = mMonthRev - mMonthExpTotal;

  // Monthly category detail for the selected month
  const monthlyExpDetail = reviewMonthIdx >= 0 ? buildMonthlyCategoryDetail(expenseCategories, reviewMonthIdx) : [];

  // ── Budget Bridge ──
  const bridgeData = useMemo(() => {
    if (reviewMonthIdx < 0 || mMonthBudgetTotal === 0) return null;

    const totalVar = mMonthExpTotal - mMonthBudgetTotal;
    const rows = monthlyExpDetail
      .filter((r) => r.budgetVar !== null && r.budgetVar !== 0)
      .map((r) => ({ name: r.name, variance: r.budgetVar }))
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
      .map((r) => ({ name: r.name, variance: r.priorVar }))
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

  // Group sections for the settings panel
  const groups = {};
  SECTIONS.forEach((s) => {
    if (!groups[s.group]) groups[s.group] = [];
    groups[s.group].push(s);
  });

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
          <p>Upload your mapping, budget, actuals, and revenue files to get started.</p>
          <a href="#/upload" className="btn btn--primary">Go to Upload</a>
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
            <button
              className="btn btn--outline btn--settings no-print"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings size={14} />
              Customize ({visibleCount}/{ALL_SECTION_IDS.length})
            </button>
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
        </div>
      )}

      {/* ── KPI Cards ── */}
      {(show('kpiRevenue') || show('kpiExpenses') || show('kpiNet') || show('kpiBudget')) && (
        <div className="kpi-grid">
          {show('kpiRevenue') && activeRevenue.length > 0 && (
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
          {show('kpiExpenses') && expenseCategories.length > 0 && (
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
          {show('kpiNet') && (activeRevenue.length > 0 || expenseCategories.length > 0) && (
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
          {show('kpiBudget') && totalExpAnnual > 0 && (
            <KpiCard
              title="Annual Expense Budget"
              amount={totalExpAnnual}
              icon={PieChartIcon}
              type="neutral"
              comparisons={[
                { label: 'Used YTD', value: totalExpActual, pct: totalExpAnnual > 0 ? variancePct(totalExpActual, totalExpAnnual) : 0 },
              ]}
            />
          )}
        </div>
      )}

      {/* ── Full-width Timeline ── */}
      {show('timeline') && timelineData.length > 0 && (
        <TimelineChart
          title="Expense Timeline: Prior Year Actuals → Current Actuals → Forward Budget"
          data={timelineData}
          actualsYear={actualsYear}
          budgetYear={budgetYear}
          priorYear={priorYear}
        />
      )}

      {/* ── Program Breakdown Pie ── */}
      {show('pieBreakdown') && pieData.length > 0 && (
        <div className="chart-grid">
          <div className="chart-container">
            <h3 className="chart__title">Program Breakdown (YTD)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => format(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Bar Charts ── */}
      {(show('chartRevenue') || show('chartExpense')) && (
        <div className="chart-grid">
          {show('chartRevenue') && revenueChartData.length > 0 && (
            <MonthlyChart
              title="Revenue: Actual vs Prior Year"
              data={revenueChartData}
              actualsYear={revActualsYr}
              budgetYear={null}
              priorYear={revPriorYr}
            />
          )}
          {show('chartExpense') && expenseChartData.length > 0 && (
            <MonthlyChart
              title="Expenses: Actual vs Prior Year"
              data={expenseChartData}
              actualsYear={actualsYear}
              budgetYear={budgetYear}
              priorYear={priorYear}
            />
          )}
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

          {/* Monthly KPI cards */}
          {show('monthlyKpis') && (
            <div className="kpi-grid" style={{ marginTop: 16 }}>
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
          )}

          {/* Budget & YoY Bridges */}
          {show('monthlyBridge') && (bridgeData || yoyBridgeData) && (
            <div className="bridge" style={{ marginTop: 16 }}>
              <h3 className="fin-table__title">
                {reviewMonthLabel} {reviewActualsYear} — Expense Bridges
              </h3>

              {/* Combined narrative */}
              <div className="bridge__narrative">
                {bridgeData && <p>{bridgeData.narrative}</p>}
                {yoyBridgeData && <p>{yoyBridgeData.narrative}</p>}
              </div>

              {/* Side-by-side tables */}
              <div className="bridge__grid">
                {/* Budget Bridge */}
                {bridgeData && (
                  <div>
                    <h4 className="bridge__subtitle">vs Budget</h4>
                    <div className="fin-table-scroll">
                      <table className="fin-table bridge__table">
                        <thead>
                          <tr>
                            <th className="fin-table__category">Item</th>
                            <th className="bridge__amount">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bridge__row bridge__row--anchor">
                            <td className="fin-table__category"><strong>Budgeted Expenses</strong></td>
                            <td className="bridge__amount"><strong>{format(bridgeData.baseTotal)}</strong></td>
                          </tr>
                          {bridgeData.rows.map((row) => (
                            <tr
                              key={row.name}
                              className={`bridge__row ${row.variance > 0 ? 'bridge__row--over' : 'bridge__row--under'}`}
                            >
                              <td className="fin-table__category bridge__indent">{row.name}</td>
                              <td className={`bridge__amount ${row.variance > 0 ? 'unfavorable' : 'favorable'}`}>
                                {row.variance > 0 ? '+' : ''}{format(row.variance)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bridge__row bridge__row--anchor bridge__row--total">
                            <td className="fin-table__category"><strong>Actual Expenses</strong></td>
                            <td className="bridge__amount"><strong>{format(bridgeData.actualTotal)}</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* YoY Bridge */}
                {yoyBridgeData && (
                  <div>
                    <h4 className="bridge__subtitle">vs Prior Year ({reviewPriorYr})</h4>
                    <div className="fin-table-scroll">
                      <table className="fin-table bridge__table">
                        <thead>
                          <tr>
                            <th className="fin-table__category">Item</th>
                            <th className="bridge__amount">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bridge__row bridge__row--anchor">
                            <td className="fin-table__category"><strong>{reviewMonthLabel} {reviewPriorYr} Expenses</strong></td>
                            <td className="bridge__amount"><strong>{format(yoyBridgeData.baseTotal)}</strong></td>
                          </tr>
                          {yoyBridgeData.rows.map((row) => (
                            <tr
                              key={row.name}
                              className={`bridge__row ${row.variance > 0 ? 'bridge__row--over' : 'bridge__row--under'}`}
                            >
                              <td className="fin-table__category bridge__indent">{row.name}</td>
                              <td className={`bridge__amount ${row.variance > 0 ? 'unfavorable' : 'favorable'}`}>
                                {row.variance > 0 ? '+' : ''}{format(row.variance)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bridge__row bridge__row--anchor bridge__row--total">
                            <td className="fin-table__category"><strong>Actual Expenses</strong></td>
                            <td className="bridge__amount"><strong>{format(yoyBridgeData.actualTotal)}</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Monthly category breakdown table */}
          {show('monthlyDetail') && monthlyExpDetail.length > 0 && (
            <div className="fin-table-container" style={{ marginTop: 16 }}>
              <h3 className="fin-table__title">
                {reviewMonthLabel} {reviewActualsYear} — Expenses by Category
              </h3>
              <div className="fin-table-scroll">
                <table className="fin-table">
                  <thead>
                    <tr>
                      <th className="fin-table__category">Category</th>
                      <th>Actual</th>
                      <th>Budget</th>
                      <th>Var ($)</th>
                      <th>Var (%)</th>
                      <th>{reviewMonthLabel} {reviewPriorYr}</th>
                      <th>YoY ($)</th>
                      <th>YoY (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyExpDetail.filter((r) => r.actual !== null || r.budget > 0).map((row) => (
                      <tr key={row.id}>
                        <td className="fin-table__category">{row.name}</td>
                        <td>{row.actual !== null ? format(row.actual) : '—'}</td>
                        <td>{format(row.budget)}</td>
                        <td className={row.budgetVar !== null ? (row.budgetVar <= 0 ? 'favorable' : 'unfavorable') : ''}>
                          {row.budgetVar !== null ? format(row.budgetVar) : '—'}
                        </td>
                        <td className={row.budgetVarPct !== null ? (row.budgetVarPct <= 0 ? 'favorable' : 'unfavorable') : ''}>
                          {row.budgetVarPct !== null ? `${row.budgetVarPct > 0 ? '+' : ''}${row.budgetVarPct.toFixed(1)}%` : '—'}
                        </td>
                        <td>{format(row.prior)}</td>
                        <td className={row.priorVar !== null ? (row.priorVar <= 0 ? 'favorable' : 'unfavorable') : ''}>
                          {row.priorVar !== null ? format(row.priorVar) : '—'}
                        </td>
                        <td className={row.priorVarPct !== null ? (row.priorVarPct <= 0 ? 'favorable' : 'unfavorable') : ''}>
                          {row.priorVarPct !== null ? `${row.priorVarPct > 0 ? '+' : ''}${row.priorVarPct.toFixed(1)}%` : '—'}
                        </td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="fin-table__total-row">
                      <td className="fin-table__category"><strong>Total</strong></td>
                      <td><strong>{format(mMonthExpTotal)}</strong></td>
                      <td><strong>{format(mMonthBudgetTotal)}</strong></td>
                      <td className={mMonthExpTotal <= mMonthBudgetTotal ? 'favorable' : 'unfavorable'}>
                        <strong>{format(mMonthExpTotal - mMonthBudgetTotal)}</strong>
                      </td>
                      <td className={mMonthExpTotal <= mMonthBudgetTotal ? 'favorable' : 'unfavorable'}>
                        <strong>{mMonthBudgetTotal ? `${variancePct(mMonthExpTotal, mMonthBudgetTotal).toFixed(1)}%` : '—'}</strong>
                      </td>
                      <td><strong>{format(mMonthPriorTotal)}</strong></td>
                      <td className={mMonthExpTotal <= mMonthPriorTotal ? 'favorable' : 'unfavorable'}>
                        <strong>{format(mMonthExpTotal - mMonthPriorTotal)}</strong>
                      </td>
                      <td className={mMonthExpTotal <= mMonthPriorTotal ? 'favorable' : 'unfavorable'}>
                        <strong>{mMonthPriorTotal ? `${variancePct(mMonthExpTotal, mMonthPriorTotal).toFixed(1)}%` : '—'}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Expense Table ── */}
      {show('tableExpenses') && expRows.length > 0 && (
        <FinancialTable
          title="All Expenses by Category"
          rows={expRows}
          isRevenue={false}
        />
      )}

      {/* ── Revenue Table ── */}
      {show('tableRevenue') && revenueRows.length > 0 && (
        <FinancialTable
          title="Revenue Detail"
          rows={revenueRows}
          isRevenue
        />
      )}

      {/* ── Budget Progress: Expenses ── */}
      {show('budgetExpenses') && expenseCategories.length > 0 && (
        <div className="section">
          <h3 className="section__title">Annual Budget Utilization — Expenses</h3>
          {expenseCategories.filter((cat) => cat.budgetAnnual > 0).map((cat) => {
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

      {/* ── Budget Progress: Revenue ── */}
      {show('budgetRevenue') && activeRevenue.length > 0 && (
        <div className="section">
          <h3 className="section__title">Annual Budget Utilization — Revenue</h3>
          {activeRevenue.filter((cat) => cat.budgetAnnual > 0).map((cat) => {
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
    </div>
  );
}
