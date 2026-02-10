import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useCurrency } from '../data/CurrencyContext';

export default function MonthlyChart({ title, data, actualsYear, budgetYear, priorYear }) {
  const { format, convert } = useCurrency();

  const budgetMatchesActuals = !actualsYear || !budgetYear || budgetYear === actualsYear;

  // Legend labels with year context
  const budgetLabel = budgetMatchesActuals
    ? (budgetYear ? `Budget ${budgetYear}` : 'Budget')
    : 'Budget (none)';
  const actualLabel = actualsYear ? `Actual ${actualsYear}` : 'Actual';
  const priorLabel = priorYear ? `Prior Year ${priorYear}` : 'Prior Year';

  // Convert data for display
  const chartData = data.map((d) => ({
    ...d,
    budget: convert(d.budget),
    actual: d.actual !== null ? convert(d.actual) : null,
    priorYear: convert(d.priorYear),
  }));

  // Only show budget bar if there's matching budget data
  const showBudget = budgetMatchesActuals && chartData.some((d) => d.budget > 0);
  // Only show prior year bar if there's data
  const showPrior = chartData.some((d) => d.priorYear > 0);

  return (
    <div className="chart-container">
      <h3 className="chart__title">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => format(v)} tick={{ fontSize: 11 }} width={80} />
          <Tooltip formatter={(value) => format(value)} />
          <Legend />
          <ReferenceLine y={0} stroke="#9ca3af" />
          {showBudget && (
            <Bar dataKey="budget" name={budgetLabel} fill="#94a3b8" radius={[2, 2, 0, 0]} />
          )}
          {showPrior && (
            <Bar dataKey="priorYear" name={priorLabel} fill="#c4b5fd" radius={[2, 2, 0, 0]} />
          )}
          <Bar dataKey="actual" name={actualLabel} fill="#2563eb" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
