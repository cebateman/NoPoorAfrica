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

export default function MonthlyChart({ title, data }) {
  const { format, convert } = useCurrency();

  // Convert data for display
  const chartData = data.map((d) => ({
    ...d,
    budget: convert(d.budget),
    actual: d.actual !== null ? convert(d.actual) : null,
    priorYear: convert(d.priorYear),
  }));

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
          <Bar dataKey="budget" name="Budget" fill="#94a3b8" radius={[2, 2, 0, 0]} />
          <Bar dataKey="priorYear" name="Prior Year" fill="#c4b5fd" radius={[2, 2, 0, 0]} />
          <Bar dataKey="actual" name="Actual" fill="#2563eb" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
