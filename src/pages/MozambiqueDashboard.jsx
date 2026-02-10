import { useState } from 'react';
import { Globe, TrendingDown, DollarSign, PieChart } from 'lucide-react';
import {
  mzCategories as defaultMzCategories,
  mzRevenue as defaultMzRevenue,
  mzLeadership,
  MONTHS,
  FISCAL_YEAR,
} from '../data/financialData';
import { useData } from '../data/DataContext';
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

export default function MozambiqueDashboard() {
  const { hasData, allCategories, centers, getCategoriesForCenter, dataYears } = useData();
  const [selectedCenter, setSelectedCenter] = useState('');

  // Use uploaded data if available, otherwise fall back to defaults
  const categories = hasData
    ? (selectedCenter ? getCategoriesForCenter(selectedCenter) : allCategories)
    : defaultMzCategories;

  const year = hasData && dataYears.length > 0 ? dataYears[dataYears.length - 1] : FISCAL_YEAR;

  // For Mozambique we show expenses only (no separate revenue view when using uploaded data)
  // The uploaded data represents expense line items
  const expActual = ytdTotal(categories);
  const expBudget = ytdBudgetTotal(categories);
  const expPrior = ytdPriorYearTotal(categories);
  const expAnnual = fullYearBudgetTotal(categories);

  // Determine months with data
  const maxActualMonths = categories.reduce(
    (max, cat) => Math.max(max, (cat.actualMonthly || []).length),
    0,
  );
  const monthLabel =
    maxActualMonths > 0
      ? MONTHS[maxActualMonths - 1]
      : 'January';

  // Table rows
  const expenseRows = buildCategorySummary(categories);

  // Chart data
  const expenseChartData = buildMonthlyComparison(categories, MONTHS);

  // When using uploaded data, we don't have a separate revenue stream
  // Show the funding view only with default data
  const useDefaultRevenue = !hasData;
  const mzRevenue = useDefaultRevenue ? defaultMzRevenue : [];
  const revActual = useDefaultRevenue ? ytdTotal(mzRevenue) : 0;
  const revBudget = useDefaultRevenue ? ytdBudgetTotal(mzRevenue) : 0;
  const revPrior = useDefaultRevenue ? ytdPriorYearTotal(mzRevenue) : 0;
  const revAnnual = useDefaultRevenue ? fullYearBudgetTotal(mzRevenue) : 0;

  const netActual = useDefaultRevenue ? revActual - expActual : -expActual;
  const netBudget = useDefaultRevenue ? revBudget - expBudget : -expBudget;
  const netPrior = useDefaultRevenue ? revPrior - expPrior : -expPrior;

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h2>
          <Globe size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Mozambique Operations — FY {year}
        </h2>
        <p className="dashboard__subtitle">
          Budget vs. Actual vs. Prior Year &middot; Year-to-Date through {monthLabel} {year}
          <br />
          <span className="dashboard__note">All amounts shown in USD</span>
        </p>
      </div>

      {/* Center filter */}
      {hasData && centers.length > 1 && (
        <div className="filter-bar">
          <label htmlFor="center-filter">Center Location:</label>
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

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          title="YTD Program Expenses"
          amount={expActual}
          icon={TrendingDown}
          type="expense"
          comparisons={[
            {
              label: 'vs Budget',
              value: variance(expActual, expBudget),
              pct: variancePct(expActual, expBudget),
              favorable: expActual <= expBudget,
            },
            {
              label: 'vs Prior Year',
              value: variance(expActual, expPrior),
              pct: variancePct(expActual, expPrior),
              favorable: expActual <= expPrior,
            },
          ]}
        />
        <KpiCard
          title="Annual Program Budget"
          amount={expAnnual}
          icon={PieChart}
          type="neutral"
          comparisons={[
            {
              label: 'Budget used',
              value: expActual,
              pct: expAnnual > 0 ? variancePct(expActual, expAnnual) : 0,
            },
            {
              label: 'Months reported',
              value: maxActualMonths,
              pct: (maxActualMonths / 12) * 100 - 100,
            },
          ]}
        />
        {useDefaultRevenue && (
          <>
            <KpiCard
              title="YTD Funding Received"
              amount={revActual}
              icon={DollarSign}
              type="revenue"
              comparisons={[
                {
                  label: 'vs Budget',
                  value: variance(revActual, revBudget),
                  pct: variancePct(revActual, revBudget),
                  favorable: revActual >= revBudget,
                },
                {
                  label: 'vs Prior Year',
                  value: variance(revActual, revPrior),
                  pct: variancePct(revActual, revPrior),
                  favorable: revActual >= revPrior,
                },
              ]}
            />
            <KpiCard
              title="YTD Net Position"
              amount={netActual}
              icon={DollarSign}
              type={netActual >= 0 ? 'revenue' : 'expense'}
              comparisons={[
                {
                  label: 'vs Budget',
                  value: variance(netActual, netBudget),
                  pct: variancePct(netActual, netBudget),
                  favorable: netActual >= netBudget,
                },
                {
                  label: 'vs Prior Year',
                  value: variance(netActual, netPrior),
                  pct: variancePct(netActual, netPrior),
                  favorable: netActual >= netPrior,
                },
              ]}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="chart-grid">
        <MonthlyChart
          title="Monthly Program Spend: Budget vs Actual vs Prior Year"
          data={expenseChartData}
        />
        {useDefaultRevenue && (
          <MonthlyChart
            title="Monthly Funding: Budget vs Actual vs Prior Year"
            data={buildMonthlyComparison(mzRevenue, MONTHS)}
          />
        )}
      </div>

      {/* Tables */}
      <FinancialTable
        title="Program Expense Detail by Category"
        rows={expenseRows}
        isRevenue={false}
      />
      {useDefaultRevenue && (
        <FinancialTable
          title="Funding Sources Detail"
          rows={buildCategorySummary(mzRevenue)}
          isRevenue
        />
      )}

      {/* Budget Progress */}
      <div className="section">
        <h3 className="section__title">Annual Budget Utilization — Program Expenses</h3>
        {categories.map((cat) => {
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

      {/* Leadership */}
      <LeadershipList title="Mozambique Leadership Team" members={mzLeadership} />
    </div>
  );
}
