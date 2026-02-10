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
  mzCategories,
  mzRevenue,
  usLeadership,
  mzLeadership,
  FISCAL_YEAR,
  MONTHS,
} from '../data/financialData';
import {
  ytdTotal,
  ytdBudgetTotal,
  ytdPriorYearTotal,
  fullYearBudgetTotal,
  variance,
  variancePct,
  formatCurrency,
  formatPct,
  buildMonthlyComparison,
} from '../utils/calculations';
import KpiCard from '../components/KpiCard';
import MonthlyChart from '../components/MonthlyChart';
import LeadershipList from '../components/LeadershipList';

const PIE_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

const currencyFormatter = (value) => formatCurrency(value);

export default function ExecutiveOverview() {
  // ── Combined totals ──
  const allRevenue = [...usRevenue, ...mzRevenue];
  const allExpenses = [...usCategories, ...mzCategories];

  // Note: MZ revenue includes US transfers, so consolidated org revenue
  // is really just US revenue + MZ local revenue (excl. transfers)
  // For simplicity in this dashboard we show each entity separately

  // US figures
  const usRevYtd = ytdTotal(usRevenue);
  const usRevBudget = ytdBudgetTotal(usRevenue);
  const usRevPrior = ytdPriorYearTotal(usRevenue);
  const usExpYtd = ytdTotal(usCategories);
  const usExpBudget = ytdBudgetTotal(usCategories);
  const usExpPrior = ytdPriorYearTotal(usCategories);
  const usNetYtd = usRevYtd - usExpYtd;

  // MZ figures
  const mzRevYtd = ytdTotal(mzRevenue);
  const mzRevBudget = ytdBudgetTotal(mzRevenue);
  const mzRevPrior = ytdPriorYearTotal(mzRevenue);
  const mzExpYtd = ytdTotal(mzCategories);
  const mzExpBudget = ytdBudgetTotal(mzCategories);
  const mzExpPrior = ytdPriorYearTotal(mzCategories);
  const mzNetYtd = mzRevYtd - mzExpYtd;

  // Consolidated (eliminates inter-entity transfer to avoid double count)
  const transferActual = ytdTotal(
    usCategories.filter((c) => c.id === 'transfers'),
  );
  const consolidatedRev = usRevYtd + mzRevYtd - transferActual; // remove MZ side of transfer
  const consolidatedExp = usExpYtd + mzExpYtd - transferActual; // remove US side of transfer
  const consolidatedNet = consolidatedRev - consolidatedExp;

  // Pie data for MZ program allocation
  const mzPieData = mzCategories.map((cat) => ({
    name: cat.name,
    value: ytdTotal([cat]),
  }));

  // Combined monthly expense chart
  const combinedExpenseChart = MONTHS.map((month, i) => {
    const usBudget = usCategories.reduce((s, c) => s + (c.budgetMonthly[i] || 0), 0);
    const mzBudget = mzCategories.reduce((s, c) => s + (c.budgetMonthly[i] || 0), 0);
    const usActual = i === 0 ? usCategories.reduce((s, c) => s + (c.actualMonthly[i] || 0), 0) : null;
    const mzActual = i === 0 ? mzCategories.reduce((s, c) => s + (c.actualMonthly[i] || 0), 0) : null;
    const usPrior = usCategories.reduce((s, c) => s + (c.priorYearMonthly[i] || 0), 0);
    const mzPrior = mzCategories.reduce((s, c) => s + (c.priorYearMonthly[i] || 0), 0);
    return {
      month,
      budget: usBudget + mzBudget,
      actual: usActual !== null && mzActual !== null ? usActual + mzActual : null,
      priorYear: usPrior + mzPrior,
    };
  });

  const usRevenueChart = buildMonthlyComparison(usRevenue, MONTHS);

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h2>
          <BarChart3 size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Executive Overview — FY {FISCAL_YEAR}
        </h2>
        <p className="dashboard__subtitle">
          Consolidated financial position through January {FISCAL_YEAR}
        </p>
      </div>

      {/* Consolidated KPIs */}
      <h3 className="section__title">Consolidated Organization</h3>
      <div className="kpi-grid">
        <KpiCard
          title="Consolidated Revenue"
          amount={consolidatedRev}
          icon={TrendingUp}
          type="revenue"
          comparisons={[
            {
              label: 'US Revenue',
              value: usRevYtd,
              pct: variancePct(usRevYtd, usRevBudget),
            },
            {
              label: 'MZ Local Rev.',
              value: mzRevYtd - transferActual,
              pct: variancePct(mzRevYtd - transferActual, mzRevBudget - ytdBudgetTotal(usCategories.filter((c) => c.id === 'transfers'))),
            },
          ]}
        />
        <KpiCard
          title="Consolidated Expenses"
          amount={consolidatedExp}
          icon={TrendingDown}
          type="expense"
          comparisons={[
            {
              label: 'US Expenses',
              value: usExpYtd - transferActual,
              pct: variancePct(usExpYtd - transferActual, usExpBudget - ytdBudgetTotal(usCategories.filter((c) => c.id === 'transfers'))),
            },
            {
              label: 'MZ Program Exp.',
              value: mzExpYtd,
              pct: variancePct(mzExpYtd, mzExpBudget),
            },
          ]}
        />
        <KpiCard
          title="Consolidated Net"
          amount={consolidatedNet}
          icon={DollarSign}
          type={consolidatedNet >= 0 ? 'revenue' : 'expense'}
          comparisons={[
            { label: 'US Net', value: usNetYtd, pct: 0 },
            { label: 'MZ Net', value: mzNetYtd, pct: 0 },
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
            <span>YTD Funding</span>
            <span className="entity-card__value">{formatCurrency(mzRevYtd)}</span>
          </div>
          <div className="entity-card__row">
            <span>YTD Program Expenses</span>
            <span className="entity-card__value">{formatCurrency(mzExpYtd)}</span>
          </div>
          <div className="entity-card__row entity-card__row--highlight">
            <span>Net Position</span>
            <span className={`entity-card__value ${mzNetYtd >= 0 ? 'favorable' : 'unfavorable'}`}>
              {formatCurrency(mzNetYtd)}
            </span>
          </div>
          <div className="entity-card__row">
            <span>vs Budget</span>
            <span
              className={`entity-card__value ${
                mzNetYtd >= mzRevBudget - mzExpBudget ? 'favorable' : 'unfavorable'
              }`}
            >
              {formatPct(variancePct(mzNetYtd, mzRevBudget - mzExpBudget))}
            </span>
          </div>
          <div className="entity-card__row">
            <span>vs Prior Year</span>
            <span
              className={`entity-card__value ${
                mzNetYtd >= mzRevPrior - mzExpPrior ? 'favorable' : 'unfavorable'
              }`}
            >
              {formatPct(variancePct(mzNetYtd, mzRevPrior - mzExpPrior))}
            </span>
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
          title="Combined Expenses: Budget vs Actual vs Prior Year"
          data={combinedExpenseChart}
        />
      </div>

      {/* MZ Program Allocation Pie */}
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

      {/* Leadership */}
      <div className="leadership-grid">
        <LeadershipList title="US Leadership" members={usLeadership} />
        <LeadershipList title="Mozambique Leadership" members={mzLeadership} />
      </div>
    </div>
  );
}
