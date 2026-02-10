import { Globe, TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';
import {
  mzCategories,
  mzRevenue,
  mzLeadership,
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

export default function MozambiqueDashboard() {
  // Revenue / Funding KPIs
  const revActual = ytdTotal(mzRevenue);
  const revBudget = ytdBudgetTotal(mzRevenue);
  const revPrior = ytdPriorYearTotal(mzRevenue);
  const revAnnual = fullYearBudgetTotal(mzRevenue);

  // Expense KPIs
  const expActual = ytdTotal(mzCategories);
  const expBudget = ytdBudgetTotal(mzCategories);
  const expPrior = ytdPriorYearTotal(mzCategories);
  const expAnnual = fullYearBudgetTotal(mzCategories);

  // Net
  const netActual = revActual - expActual;
  const netBudget = revBudget - expBudget;
  const netPrior = revPrior - expPrior;

  // Table rows
  const revenueRows = buildCategorySummary(mzRevenue);
  const expenseRows = buildCategorySummary(mzCategories);

  // Chart data
  const revenueChartData = buildMonthlyComparison(mzRevenue, MONTHS);
  const expenseChartData = buildMonthlyComparison(mzCategories, MONTHS);

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h2>Mozambique Operations — FY {FISCAL_YEAR}</h2>
        <p className="dashboard__subtitle">
          Budget vs. Actual vs. Prior Year &middot; Year-to-Date through January {FISCAL_YEAR}
          <br />
          <span className="dashboard__note">All amounts shown in USD</span>
        </p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          title="YTD Funding Received"
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
        <KpiCard
          title="Annual Program Budget"
          amount={expAnnual}
          icon={PieChart}
          type="neutral"
          comparisons={[
            {
              label: 'Funding used',
              value: revActual,
              pct: variancePct(revActual, revAnnual),
            },
            {
              label: 'Expenses used',
              value: expActual,
              pct: variancePct(expActual, expAnnual),
            },
          ]}
        />
      </div>

      {/* Charts */}
      <div className="chart-grid">
        <MonthlyChart title="Monthly Funding: Budget vs Actual vs Prior Year" data={revenueChartData} />
        <MonthlyChart title="Monthly Program Spend: Budget vs Actual vs Prior Year" data={expenseChartData} />
      </div>

      {/* Tables */}
      <FinancialTable title="Funding Sources Detail" rows={revenueRows} isRevenue />
      <FinancialTable title="Program Expense Detail" rows={expenseRows} isRevenue={false} />

      {/* Budget Progress */}
      <div className="section">
        <h3 className="section__title">Annual Budget Utilization — Funding</h3>
        {mzRevenue.map((cat) => {
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
        <h3 className="section__title">Annual Budget Utilization — Program Expenses</h3>
        {mzCategories.map((cat) => {
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
