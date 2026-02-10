import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ExecutiveOverview from './pages/ExecutiveOverview';
import USDashboard from './pages/USDashboard';
import MozambiqueDashboard from './pages/MozambiqueDashboard';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ExecutiveOverview />} />
          <Route path="us" element={<USDashboard />} />
          <Route path="mozambique" element={<MozambiqueDashboard />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
