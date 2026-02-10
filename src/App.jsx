import { HashRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from './data/DataContext';
import { CurrencyProvider } from './data/CurrencyContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DataUpload from './pages/DataUpload';

export default function App() {
  return (
    <DataProvider>
      <CurrencyProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="upload" element={<DataUpload />} />
            </Route>
          </Routes>
        </HashRouter>
      </CurrencyProvider>
    </DataProvider>
  );
}
