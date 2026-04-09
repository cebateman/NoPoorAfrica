import { useCallback, useRef, useState } from 'react';
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useData } from '../data/DataContext';
import { useCurrency } from '../data/CurrencyContext';

const FILE_CONFIGS = [
  {
    key: 'mapping',
    title: 'Category Mapping',
    description:
      'Maps line items to expense types (People, Girls Program, Auto, etc.). Columns: Line Item Account, Account, Sub-Account, Expense Type',
    required: true,
  },
  {
    key: 'budget',
    title: 'Budget Data',
    description:
      'Monthly budget amounts. Same format as actuals: Center Location, Date, Month, Year, Line Item, Category, Account, Sub Account, Amount (MT), Amount (USD)',
    required: true,
  },
  {
    key: 'actuals',
    title: 'Expense Actuals',
    description:
      'All historical expense data in one file. Include as many years as you have — the system will automatically use the most recent year as current and the year before as prior year comparison. Columns: Center Location, Date, Month, Year, Line Item, Category, Account, Sub Account, Amount (MT), Amount (USD)',
    required: true,
  },
  {
    key: 'revenue',
    title: 'Revenue / Donations',
    description:
      'Donation and revenue records. Include all years of data — auto-splits by year like expenses. Columns: Source/Donor, Date, Month, Year, Category, Amount (USD)',
    required: false,
  },
];

function FileDropZone({ config, csvText, rowCount, yearInfo, onUpload, onClear }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const hasFile = csvText && csvText.length > 0;

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => onUpload(e.target.result);
      reader.readAsText(file);
    },
    [onUpload],
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e) => {
      handleFile(e.target.files[0]);
      e.target.value = '';
    },
    [handleFile],
  );

  return (
    <div className={`upload-card ${hasFile ? 'upload-card--loaded' : ''}`}>
      <div className="upload-card__header">
        <div className="upload-card__title-row">
          {hasFile ? (
            <CheckCircle size={18} className="upload-card__icon upload-card__icon--success" />
          ) : (
            <FileText size={18} className="upload-card__icon" />
          )}
          <h3>
            {config.title}
            {!config.required && <span className="upload-card__optional"> (optional)</span>}
          </h3>
        </div>
        <p className="upload-card__desc">{config.description}</p>
      </div>

      {hasFile ? (
        <div className="upload-card__status">
          <div className="upload-card__file-info">
            <CheckCircle size={14} className="upload-card__icon--success" />
            <span>
              File loaded &middot; {rowCount.toLocaleString()} data rows &middot;{' '}
              {(csvText.length / 1024).toFixed(1)} KB
              {yearInfo && <> &middot; Years: {yearInfo}</>}
            </span>
          </div>
          <div className="upload-card__actions">
            <button className="btn btn--sm btn--outline" onClick={handleClick}>
              Replace
            </button>
            <button className="btn btn--sm btn--danger" onClick={onClear}>
              <Trash2 size={14} /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`upload-card__dropzone ${dragOver ? 'upload-card__dropzone--active' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <Upload size={32} className="upload-card__upload-icon" />
          <p>
            <strong>Drop CSV file here</strong> or click to browse
          </p>
          <p className="upload-card__hint">Supports .csv and .tsv files exported from Google Sheets</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.txt"
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />
    </div>
  );
}

export default function DataUpload() {
  const data = useData();
  const { format } = useCurrency();

  const getCSVText = (key) => {
    const map = { mapping: data.mappingCSV, budget: data.budgetCSV, actuals: data.actualsCSV, revenue: data.revenueCSV };
    return map[key] || '';
  };

  const getRowCount = (key) => {
    const map = {
      mapping: Object.keys(data.mapping).length,
      budget: data.budgetRows.length,
      actuals: data.totalActualsRowCount,
      revenue: data.totalRevenueRowCount,
    };
    return map[key] || 0;
  };

  const getYearInfo = (key) => {
    if (key === 'actuals' && data.actualsYears.length > 0) {
      return data.actualsYears.join(', ');
    }
    if (key === 'revenue' && data.revenueYears.length > 0) {
      return data.revenueYears.join(', ');
    }
    return null;
  };

  const getUploader = (key) => {
    const map = {
      mapping: data.uploadMapping,
      budget: data.uploadBudget,
      actuals: data.uploadActuals,
      revenue: data.uploadRevenue,
    };
    return map[key];
  };

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h2>Upload Financial Data</h2>
        <p className="dashboard__subtitle">
          Upload CSV files exported from Google Sheets to populate the dashboard.
          Data is stored in your browser and persists between sessions.
        </p>
      </div>

      {/* Instructions */}
      <div className="upload-instructions">
        <Info size={18} />
        <div>
          <strong>How to export from Google Sheets:</strong>
          <ol>
            <li>Open your Google Sheet</li>
            <li>Go to <strong>File &rarr; Download &rarr; Comma-separated values (.csv)</strong></li>
            <li>Upload the downloaded file below</li>
          </ol>
          <p>
            Upload in order: <strong>1) Mapping</strong>, then <strong>2) Budget</strong>,{' '}
            <strong>3) Expense Actuals</strong>, and <strong>4) Revenue</strong>.
            Include all years of data in one file — the system auto-detects years.
          </p>
        </div>
      </div>

      {/* Upload cards */}
      <div className="upload-grid">
        {FILE_CONFIGS.map((config) => (
          <FileDropZone
            key={config.key}
            config={config}
            csvText={getCSVText(config.key)}
            rowCount={getRowCount(config.key)}
            yearInfo={getYearInfo(config.key)}
            onUpload={getUploader(config.key)}
            onClear={() => data.clearFile(config.key)}
          />
        ))}
      </div>

      {/* Actuals by center diagnostic — helps verify uploads (esp. US) */}
      {data.hasActuals && data.actualsByCenter.length > 0 && (
        <div className="upload-summary">
          <h3>Expense Actuals by Location</h3>
          <div className="fin-table-scroll">
            <table className="fin-table">
              <thead>
                <tr>
                  <th className="fin-table__category">Center / Location</th>
                  <th>Rows</th>
                  <th>Years</th>
                  <th>Total (USD)</th>
                </tr>
              </thead>
              <tbody>
                {data.actualsByCenter.map((g) => (
                  <tr key={g.center}>
                    <td className="fin-table__category">{g.center}</td>
                    <td>{g.rows.toLocaleString()}</td>
                    <td>{g.years.join(', ')}</td>
                    <td><strong>{format(g.totalUSD)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unmapped line items — flags rows with no mapping entry */}
      {data.hasActuals && data.unmappedLineItems.length > 0 && (
        <div className="upload-summary">
          <h3>
            <AlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Unmapped Line Items ({data.unmappedLineItems.length})
          </h3>
          <p className="upload-summary__hint">
            These line items have no entry in the mapping CSV. They still appear in
            the dashboard — grouped under their line item name as a fallback expense
            type. Add them to your mapping CSV to roll them up into standard categories.
          </p>
          <div className="fin-table-scroll">
            <table className="fin-table">
              <thead>
                <tr>
                  <th className="fin-table__category">Line Item</th>
                  <th>Center(s)</th>
                  <th>Rows</th>
                </tr>
              </thead>
              <tbody>
                {data.unmappedLineItems.map((item) => (
                  <tr key={item.lineItem}>
                    <td className="fin-table__category">{item.lineItem}</td>
                    <td>{item.centers.join(', ')}</td>
                    <td>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Data summary */}
      {(data.hasData || data.hasRevenue) && (
        <div className="upload-summary">
          <h3>Data Summary</h3>
          <div className="upload-summary__grid">
            {data.centers.length > 0 && (
              <div className="upload-summary__item">
                <span className="upload-summary__label">Centers</span>
                <span className="upload-summary__value">{data.centers.join(', ')}</span>
              </div>
            )}
            {data.dataYears.length > 0 && (
              <div className="upload-summary__item">
                <span className="upload-summary__label">Expense Years</span>
                <span className="upload-summary__value">{data.dataYears.join(', ')}</span>
              </div>
            )}
            {data.revenueYears.length > 0 && (
              <div className="upload-summary__item">
                <span className="upload-summary__label">Revenue Years</span>
                <span className="upload-summary__value">{data.revenueYears.join(', ')}</span>
              </div>
            )}
            {data.hasActuals && (
              <div className="upload-summary__item">
                <span className="upload-summary__label">Months with Expense Actuals</span>
                <span className="upload-summary__value">
                  {data.dataMonths.map((m) =>
                    ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m]
                  ).join(', ')}
                </span>
              </div>
            )}
            {data.allCategories.length > 0 && (
              <div className="upload-summary__item">
                <span className="upload-summary__label">Expense Categories</span>
                <span className="upload-summary__value">
                  {data.allCategories.map((c) => c.name).join(', ')}
                </span>
              </div>
            )}
            {data.revenueCategories.length > 0 && (
              <div className="upload-summary__item">
                <span className="upload-summary__label">Revenue Categories</span>
                <span className="upload-summary__value">
                  {data.revenueCategories.map((c) => c.name).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clear all */}
      {(data.hasData || data.hasRevenue) && (
        <div className="upload-clear">
          <button className="btn btn--danger" onClick={data.clearAll}>
            <Trash2 size={16} /> Clear All Uploaded Data
          </button>
        </div>
      )}

      {/* Expense data preview */}
      {data.hasActuals && data.allCategories.length > 0 && (
        <div className="fin-table-container">
          <h3 className="fin-table__title">Expense Actuals Preview by Type</h3>
          <div className="fin-table-scroll">
            <table className="fin-table">
              <thead>
                <tr>
                  <th className="fin-table__category">Expense Type</th>
                  {data.dataMonths.map((m) => (
                    <th key={m}>
                      {['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m]}
                    </th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.allCategories.map((cat) => (
                  <tr key={cat.id}>
                    <td className="fin-table__category">{cat.name}</td>
                    {data.dataMonths.map((m) => (
                      <td key={m}>
                        {format(cat.actualMonthly[m - 1] || 0)}
                      </td>
                    ))}
                    <td>
                      <strong>
                        {format(cat.actualMonthly.reduce((a, b) => a + b, 0))}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue data preview */}
      {data.hasRevenue && data.revenueCategories.length > 0 && (
        <div className="fin-table-container">
          <h3 className="fin-table__title">Revenue Preview by Category</h3>
          <div className="fin-table-scroll">
            <table className="fin-table">
              <thead>
                <tr>
                  <th className="fin-table__category">Category</th>
                  <th>YTD Total</th>
                  <th>Prior Year Total</th>
                </tr>
              </thead>
              <tbody>
                {data.revenueCategories.map((cat) => (
                  <tr key={cat.id}>
                    <td className="fin-table__category">{cat.name}</td>
                    <td>{format(cat.actualMonthly.reduce((a, b) => a + b, 0))}</td>
                    <td>{format(cat.priorYearMonthly.reduce((a, b) => a + b, 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
