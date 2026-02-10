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

const currencyFormatter = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export default function MonthlyChart({ title, data }) {
  return (
    <div className="chart-container">
      <h3 className="chart__title">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={currencyFormatter} tick={{ fontSize: 11 }} />
          <Tooltip formatter={currencyFormatter} />
          <Legend />
          <ReferenceLine y={0} stroke="#9ca3af" />
          <Bar
            dataKey="budget"
            name="Budget"
            fill="#94a3b8"
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="priorYear"
            name="Prior Year"
            fill="#c4b5fd"
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="actual"
            name="Actual"
            fill="#2563eb"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
