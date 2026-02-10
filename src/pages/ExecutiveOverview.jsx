import {
  BarChart3,
  DollarSign,
  Globe,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
  mzCategories as defaultMzCategories,
  mzRevenue as defaultMzRevenue,
  usLeadership,
  mzLeadership,
  FISCAL_YEAR,
  MONTHS,
} from '../data/financialData';
import { useData } from '../data/DataContext';
import {
  ytdTotal,
  ytdBudgetTotal,
  ytdPriorYearTotal,
  variance,
  variancePct,
  formatCurrency,
  formatPct,
  buildMonthlyComparison,
} from '../utils/calculations';
import KpiCard from '../components/KpiCard';
import MonthlyChart from '../components/MonthlyChart';
import LeadershipList from '../components/LeadershipList';

const PIE_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#be185d', '#65a30d'];

const currencyFormatter = (value) => formatCurrency(value);

export default function ExecutiveOverview() {
  const { hasData, allCategories, dataYears } = useData();

  // Mozambique categories: use uploaded data if available
  const mzCategories = hasData ? allCategories : defaultMzCategories;
  const mzRevenue = hasData ? [] : defaultMzRevenue;
  const year = hasData && dataYears.length > 0 ? dataYears[dataYears.length - 1] : FISCAL_YEAR;

  // US figures (always from default data for now)
  const usRevYtd = ytdTotal(usRevenue);
  const usRevBudget = ytdBudgetTotal(usRevenue);
  const usRevPrior = ytdPriorYearTotal(usRevenue);
  const usExpYtd = ytdTotal(usCategories);
  const usExpBudget = ytdBudgetTotal(usCategories);
  const usExpPrior = ytdPriorYearTotal(usCategories);
  const usNetYtd = usRevYtd - usExpYtd;

  // MZ figures
  const mzExpYtd = ytdTotal(mzCategories);
  const mzExpBudget = ytdBudgetTotal(mzCategories);
  const mzExpPrior = ytdPriorYearTotal(mzCategories);

  // Determine max month for MZ
  const maxMzActualMonths = mzCategories.reduce(
    (max, cat) => Math.max(max, (cat.actualMonthly || []).length),
    0,
  );
  const mzMonthLabel = maxMzActualMonths > 0
    ? MONTHS[maxMzActualMonths - 1]
    : 'January';

  // MZ revenue only when using default data
  const mzRevYtd = hasData ? 0 : ytdTotal(mzRevenue);
  const mzNetYtd = mzRevYtd - mzExpYtd;

  // Pie data for MZ program allocation
  const mzPieData = mzCategories
    .map((cat) => ({
      name: cat.name,
      value: ytdTotal([cat]),
    }))
    .filter((d) => d.value > 0);

  // Charts
  const usRevenueChart = buildMonthlyComparison(usRevenue, MONTHS);
  const mzExpenseChart = buildMonthlyComparison(mzCategories, MONTHS);

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h2>
          <BarChart3 size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Executive Overview — FY {year}
        </h2>
        <p className="dashboard__subtitle">
          Consolidated financial position &middot; US through January {FISCAL_YEAR}, Mozambique through {mzMonthLabel} {year}
          {hasData && <span className="dashboard__note"> &middot; Using uploaded data for Mozambique</span>}
        </p>
      </div>

      {/* Consolidated KPIs */}
      <h3 className="section__title">Organization Summary</h3>
      <div className="kpi-grid">
        <KpiCard
          title="US YTD Revenue"
          amount={usRevYtd}
          icon={TrendingUp}
          type="revenue"
          comparisons={[
            {
              label: 'vs Budget',
              value: variance(usRevYtd, usRevBudget),
              pct: variancePct(usRevYtd, usRevBudget),
              favorable: usRevYtd >= usRevBudget,
            },
            {
              label: 'vs Prior Year',
              value: variance(usRevYtd, usRevPrior),
              pct: variancePct(usRevYtd, usRevPrior),
              favorable: usRevYtd >= usRevPrior,
            },
          ]}
        />
        <KpiCard
          title="MZ YTD Expenses"
          amount={mzExpYtd}
          icon={TrendingDown}
          type="expense"
          comparisons={[
            {
              label: 'vs Budget',
              value: variance(mzExpYtd, mzExpBudget),
              pct: variancePct(mzExpYtd, mzExpBudget),
              favorable: mzExpYtd <= mzExpBudget,
            },
            {
              label: 'vs Prior Year',
              value: variance(mzExpYtd, mzExpPrior),
              pct: variancePct(mzExpYtd, mzExpPrior),
              favorable: mzExpYtd <= mzExpPrior,
            },
          ]}
        />
        <KpiCard
          title="US Net Income"
          amount={usNetYtd}
          icon={DollarSign}
          type={usNetYtd >= 0 ? 'revenue' : 'expense'}
          comparisons={[
            { label: 'US Revenue', value: usRevYtd, pct: 0 },
            { label: 'US Expenses', value: usExpYtd, pct: 0 },
          ]}
        />
      </div>

      {/* Entity comparison side by side */}
      <div className="entity-grid">
        {/* US Summary */}
        <div className="entity-card">
          <div className="entity-card__header">
            <DollarSign size={20} />
            <h3>US Operations</h3>
            <Link to="/us" className="entity-card__link">
              View details <ArrowRight size={14} />
            </Link>
          </div>
          <div className="entity-card__row">
            <span>YTD Revenue</span>
            <span className="entity-card__value">{formatCurrency(usRevYtd)}</span>
          </div>
          <div className="entity-card__row">
            <span>YTD Expenses</span>
            <span className="entity-card__value">{formatCurrency(usExpYtd)}</span>
          </div>
          <div className="entity-card__row entity-card__row--highlight">
            <span>Net Income</span>
            <span className={`entity-card__value ${usNetYtd >= 0 ? 'favorable' : 'unfavorable'}`}>
              {formatCurrency(usNetYtd)}
            </span>
          </div>
          <div className="entity-card__row">
            <span>vs Budget</span>
            <span
              className={`entity-card__value ${
                usRevYtd - usExpYtd >= usRevBudget - usExpBudget ? 'favorable' : 'unfavorable'
              }`}
            >
              {formatPct(
                variancePct(usRevYtd - usExpYtd, usRevBudget - usExpBudget),
              )}
            </span>
          </div>
          <div className="entity-card__row">
            <span>vs Prior Year</span>
            <span
              className={`entity-card__value ${
                usNetYtd >= usRevPrior - usExpPrior ? 'favorable' : 'unfavorable'
              }`}
            >
              {formatPct(variancePct(usNetYtd, usRevPrior - usExpPrior))}
            </span>
          </div>
        </div>

        {/* MZ Summary */}
        <div className="entity-card">
          <div className="entity-card__header">
            <Globe size={20} />
            <h3>Mozambique Operations</h3>
            <Link to="/mozambique" className="entity-card__link">
              View details <ArrowRight size={14} />
            </Link>
          </div>
          <div className="entity-card__row">
            <span>YTD Program Expenses</span>
            <span className="entity-card__value">{formatCurrency(mzExpYtd)}</span>
          </div>
          <div className="entity-card__row">
            <span>vs Budget</span>
            <span
              className={`entity-card__value ${
                mzExpYtd <= mzExpBudget ? 'favorable' : 'unfavorable'
              }`}
            >
              {formatCurrency(variance(mzExpYtd, mzExpBudget))} ({formatPct(variancePct(mzExpYtd, mzExpBudget))})
            </span>
          </div>
          <div className="entity-card__row">
            <span>vs Prior Year</span>
            <span
              className={`entity-card__value ${
                mzExpYtd <= mzExpPrior ? 'favorable' : 'unfavorable'
              }`}
            >
              {formatCurrency(variance(mzExpYtd, mzExpPrior))} ({formatPct(variancePct(mzExpYtd, mzExpPrior))})
            </span>
          </div>
          <div className="entity-card__row">
            <span>Data through</span>
            <span className="entity-card__value">{mzMonthLabel} {year}</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="chart-grid">
        <MonthlyChart
          title="US Revenue: Budget vs Actual vs Prior Year"
          data={usRevenueChart}
        />
        <MonthlyChart
          title="MZ Expenses: Budget vs Actual vs Prior Year"
          data={mzExpenseChart}
        />
      </div>

      {/* MZ Program Allocation Pie */}
      {mzPieData.length > 0 && (
        <div className="chart-container">
          <h3 className="chart__title">Mozambique Program Expense Allocation (YTD)</h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={mzPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                labelLine
              >
                {mzPieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={currencyFormatter} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Leadership */}
      <div className="leadership-grid">
        <LeadershipList title="US Leadership" members={usLeadership} />
        <LeadershipList title="Mozambique Leadership" members={mzLeadership} />
      </div>
    </div>
  );
}
