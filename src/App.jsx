import { HashRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from './data/DataContext';
import Layout from './components/Layout';
import ExecutiveOverview from './pages/ExecutiveOverview';
import USDashboard from './pages/USDashboard';
import MozambiqueDashboard from './pages/MozambiqueDashboard';
import DataUpload from './pages/DataUpload';

export default function App() {
  return (
    <DataProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<ExecutiveOverview />} />
            <Route path="us" element={<USDashboard />} />
            <Route path="mozambique" element={<MozambiqueDashboard />} />
            <Route path="upload" element={<DataUpload />} />
          </Route>
        </Routes>
      </HashRouter>
    </DataProvider>
  );
}
