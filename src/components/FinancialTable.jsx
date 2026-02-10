import { formatPct } from '../utils/calculations';
import { useCurrency } from '../data/CurrencyContext';

export default function FinancialTable({ title, rows, isRevenue }) {
  const { format } = useCurrency();

  const isFavorable = (variance, isRevenueRow) =>
    isRevenueRow ? variance >= 0 : variance <= 0;

  const totals = rows.reduce(
    (acc, row) => ({
      ytdActual: acc.ytdActual + row.ytdActual,
      ytdBudget: acc.ytdBudget + row.ytdBudget,
      ytdPrior: acc.ytdPrior + row.ytdPrior,
      annualBudget: acc.annualBudget + row.annualBudget,
      budgetVar: acc.budgetVar + row.budgetVar,
      priorVar: acc.priorVar + row.priorVar,
    }),
    { ytdActual: 0, ytdBudget: 0, ytdPrior: 0, annualBudget: 0, budgetVar: 0, priorVar: 0 },
  );

  const totalBudgetVarPct = totals.ytdBudget !== 0 ? (totals.budgetVar / totals.ytdBudget) * 100 : 0;
  const totalPriorVarPct = totals.ytdPrior !== 0 ? (totals.priorVar / totals.ytdPrior) * 100 : 0;

  return (
    <div className="fin-table-container">
      <h3 className="fin-table__title">{title}</h3>
      <div className="fin-table-scroll">
        <table className="fin-table">
          <thead>
            <tr>
              <th className="fin-table__category">Category</th>
              <th>YTD Actual</th>
              <th>YTD Budget</th>
              <th>Budget Var.</th>
              <th>Budget Var. %</th>
              <th>YTD Prior Yr</th>
              <th>Prior Yr Var.</th>
              <th>Prior Yr Var. %</th>
              <th>Annual Budget</th>
              <th>% of Annual</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="fin-table__category">
                  {row.name}
                  {row.location && <span className={`location-tag location-tag--${row.location.toLowerCase()}`}>{row.location}</span>}
                </td>
                <td>{format(row.ytdActual)}</td>
                <td>{format(row.ytdBudget)}</td>
                <td className={isFavorable(row.budgetVar, isRevenue) ? 'favorable' : 'unfavorable'}>
                  {format(row.budgetVar)}
                </td>
                <td className={isFavorable(row.budgetVar, isRevenue) ? 'favorable' : 'unfavorable'}>
                  {formatPct(row.budgetVarPct)}
                </td>
                <td>{format(row.ytdPrior)}</td>
                <td className={isFavorable(row.priorVar, isRevenue) ? 'favorable' : 'unfavorable'}>
                  {format(row.priorVar)}
                </td>
                <td className={isFavorable(row.priorVar, isRevenue) ? 'favorable' : 'unfavorable'}>
                  {formatPct(row.priorVarPct)}
                </td>
                <td>{format(row.annualBudget)}</td>
                <td>{row.pctOfAnnualBudget.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="fin-table__total-row">
              <td className="fin-table__category"><strong>Total</strong></td>
              <td><strong>{format(totals.ytdActual)}</strong></td>
              <td><strong>{format(totals.ytdBudget)}</strong></td>
              <td className={isFavorable(totals.budgetVar, isRevenue) ? 'favorable' : 'unfavorable'}>
                <strong>{format(totals.budgetVar)}</strong>
              </td>
              <td className={isFavorable(totals.budgetVar, isRevenue) ? 'favorable' : 'unfavorable'}>
                <strong>{formatPct(totalBudgetVarPct)}</strong>
              </td>
              <td><strong>{format(totals.ytdPrior)}</strong></td>
              <td className={isFavorable(totals.priorVar, isRevenue) ? 'favorable' : 'unfavorable'}>
                <strong>{format(totals.priorVar)}</strong>
              </td>
              <td className={isFavorable(totals.priorVar, isRevenue) ? 'favorable' : 'unfavorable'}>
                <strong>{formatPct(totalPriorVarPct)}</strong>
              </td>
              <td><strong>{format(totals.annualBudget)}</strong></td>
              <td>
                <strong>
                  {totals.annualBudget > 0
                    ? ((totals.ytdActual / totals.annualBudget) * 100).toFixed(1)
                    : 0}
                  %
                </strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
