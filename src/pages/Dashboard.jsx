import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieChartIcon,
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
  buildCategorySummary,
} from '../utils/calculations';
import KpiCard from '../components/KpiCard';
import FinancialTable from '../components/FinancialTable';
import MonthlyChart from '../components/MonthlyChart';
import BudgetProgressBar from '../components/BudgetProgressBar';
import LeadershipList from '../components/LeadershipList';

const PIE_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#be185d', '#65a30d'];

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
  const { hasData, allCategories, centers, getCategoriesForCenter, dataYears } = useData();
  const { format } = useCurrency();
  const [selectedCenter, setSelectedCenter] = useState('');

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

  // ── Revenue (US-based) ──
  const revActual = ytdTotal(usRevenue);
  const revBudget = ytdBudgetTotal(usRevenue);
  const revPrior = ytdPriorYearTotal(usRevenue);
  const revAnnual = fullYearBudgetTotal(usRevenue);

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
  const revenueRows = buildCategorySummary(usRevenue);
  const usExpRows = buildCategorySummary(US_EXPENSE_CATEGORIES).map((r) => ({ ...r, location: 'US' }));
  const mzExpRows = buildCategorySummary(mzCategories).map((r) => ({ ...r, location: 'MZ' }));
  const allExpRows = [...mzExpRows, ...usExpRows]; // MZ first since it's primary

  // ── Charts ──
  const revenueChartData = buildMonthlyComparison(usRevenue, MONTHS);
  const mzExpenseChartData = mzCategories.length > 0 ? buildMonthlyComparison(mzCategories, MONTHS) : [];

  // ── Pie data for MZ program allocation ──
  const mzPieData = mzCategories
    .map((cat) => ({ name: cat.name, value: ytdTotal([cat]) }))
    .filter((d) => d.value > 0);

  // ── Expense split pie (US vs MZ) ──
  const splitPieData = [
    { name: 'Mozambique Programs', value: mzExpActual },
    { name: 'US Operations', value: usExpActual },
  ].filter((d) => d.value > 0);

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h2>
          <BarChart3 size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          No Poor Africa — FY {year}
        </h2>
        <p className="dashboard__subtitle">
          Financial Leadership Dashboard
          {mzMonthLabel && <> &middot; MZ data through {mzMonthLabel} {year}</>}
          {' '}&middot; US data through January {FISCAL_YEAR}
        </p>
      </div>

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
      <div className="kpi-grid">
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
      </div>

      {/* ── Expense Split ── */}
      {splitPieData.length > 0 && (
        <div className="chart-grid">
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

          {mzPieData.length > 0 && (
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

      {/* ── Charts ── */}
      <div className="chart-grid">
        <MonthlyChart title="Revenue: Budget vs Actual vs Prior Year" data={revenueChartData} />
        {mzExpenseChartData.length > 0 && (
          <MonthlyChart title="MZ Program Expenses: Budget vs Actual vs Prior Year" data={mzExpenseChartData} />
        )}
      </div>

      {/* ── Expense Table ── */}
      <FinancialTable
        title="All Expenses by Category"
        rows={allExpRows}
        isRevenue={false}
      />

      {/* ── Revenue Table ── */}
      <FinancialTable
        title="Revenue Detail (US-based)"
        rows={revenueRows}
        isRevenue
      />

      {/* ── Budget Progress ── */}
      {mzCategories.length > 0 && (
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

      <div className="section">
        <h3 className="section__title">Annual Budget Utilization — Revenue</h3>
        {usRevenue.map((cat) => {
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

      {/* ── Leadership ── */}
      <div className="leadership-grid">
        <LeadershipList title="Mozambique Leadership" members={mzLeadership} />
        <LeadershipList title="US Leadership" members={usLeadership} />
      </div>
    </div>
  );
}
