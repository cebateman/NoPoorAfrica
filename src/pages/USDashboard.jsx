import { DollarSign, TrendingUp, TrendingDown, PieChart } from 'lucide-react';
import {
  usCategories,
  usRevenue,
  usLeadership,
  MONTHS,
  FISCAL_YEAR,
} from '../data/financialData';
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

export default function USDashboard() {
  // Revenue KPIs
  const revActual = ytdTotal(usRevenue);
  const revBudget = ytdBudgetTotal(usRevenue);
  const revPrior = ytdPriorYearTotal(usRevenue);
  const revAnnual = fullYearBudgetTotal(usRevenue);

  // Expense KPIs
  const expActual = ytdTotal(usCategories);
  const expBudget = ytdBudgetTotal(usCategories);
  const expPrior = ytdPriorYearTotal(usCategories);
  const expAnnual = fullYearBudgetTotal(usCategories);

  // Net
  const netActual = revActual - expActual;
  const netBudget = revBudget - expBudget;
  const netPrior = revPrior - expPrior;

  // Table rows
  const revenueRows = buildCategorySummary(usRevenue);
  const expenseRows = buildCategorySummary(usCategories);

  // Chart data
  const revenueChartData = buildMonthlyComparison(usRevenue, MONTHS);
  const expenseChartData = buildMonthlyComparison(usCategories, MONTHS);

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h2>
          <DollarSign size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          US Operations — FY {FISCAL_YEAR}
        </h2>
        <p className="dashboard__subtitle">
          Budget vs. Actual vs. Prior Year &middot; Year-to-Date through January {FISCAL_YEAR}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          title="YTD Revenue"
          amount={revActual}
          icon={TrendingUp}
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
          title="YTD Expenses"
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
          title="YTD Net Income"
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
        <KpiCard
          title="Annual Budget (Total)"
          amount={revAnnual}
          icon={PieChart}
          type="neutral"
          comparisons={[
            {
              label: 'Rev. used',
              value: revActual,
              pct: variancePct(revActual, revAnnual),
            },
            {
              label: 'Exp. used',
              value: expActual,
              pct: variancePct(expActual, expAnnual),
            },
          ]}
        />
      </div>

      {/* Charts */}
      <div className="chart-grid">
        <MonthlyChart title="Monthly Revenue: Budget vs Actual vs Prior Year" data={revenueChartData} />
        <MonthlyChart title="Monthly Expenses: Budget vs Actual vs Prior Year" data={expenseChartData} />
      </div>

      {/* Tables */}
      <FinancialTable title="Revenue Detail" rows={revenueRows} isRevenue />
      <FinancialTable title="Expense Detail" rows={expenseRows} isRevenue={false} />

      {/* Budget Progress */}
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

      <div className="section">
        <h3 className="section__title">Annual Budget Utilization — Expenses</h3>
        {usCategories.map((cat) => {
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
      <LeadershipList title="US Leadership Team" members={usLeadership} />
    </div>
  );
}
