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

export default function TimelineChart({ title, data, actualsYear, budgetYear, priorYear }) {
  const { format, convert } = useCurrency();

  if (!data || data.length === 0) return null;

  // Convert amounts for display currency
  const chartData = data.map((d) => ({
    ...d,
    actual: d.actual !== null ? convert(d.actual) : null,
    budget: d.budget !== null ? convert(d.budget) : null,
  }));

  // Build legend labels with years
  const actualYears = [priorYear, actualsYear].filter(Boolean);
  const actualLabel = actualYears.length > 0
    ? `Actual (${actualYears.join('-')})`
    : 'Actual';
  const budgetLabel = budgetYear ? `Budget ${budgetYear}` : 'Budget';

  const showBudget = chartData.some((d) => d.budget !== null && d.budget > 0);
  const showActual = chartData.some((d) => d.actual !== null);

  // Find January boundaries for year divider lines
  const yearBoundaries = [];
  const years = [...new Set(data.map((d) => d.year))].sort((a, b) => a - b);
  if (years.length > 1) {
    for (let i = 1; i < years.length; i++) {
      const idx = data.findIndex((d) => d.year === years[i] && d.monthIndex === 0);
      if (idx >= 0) yearBoundaries.push(data[idx].month);
    }
  }

  return (
    <div className="chart-container chart-container--full">
      <h3 className="chart__title">{title}</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10 }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tickFormatter={(v) => format(v)} tick={{ fontSize: 11 }} width={80} />
          <Tooltip formatter={(value) => format(value)} />
          <Legend />
          <ReferenceLine y={0} stroke="#9ca3af" />
          {/* Year boundary lines */}
          {yearBoundaries.map((label) => (
            <ReferenceLine key={label} x={label} stroke="#374151" strokeDasharray="4 4" strokeWidth={2} />
          ))}
          {showActual && (
            <Bar dataKey="actual" name={actualLabel} fill="#2563eb" radius={[2, 2, 0, 0]} />
          )}
          {showBudget && (
            <Bar dataKey="budget" name={budgetLabel} fill="#94a3b8" radius={[2, 2, 0, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
