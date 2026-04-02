import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import wsClient from './services/websocket';
import { useBatchStore } from './store/batchStore';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import RoleLayout from './components/layout/RoleLayout';

import MyBatches from './pages/farmer/MyBatches';
import InsurancePool from './pages/farmer/InsurancePool';
import RegisterProduce from './pages/farmer/RegisterProduce';
import FundingRequests from './pages/farmer/FundingRequests';

import ScanBadge from './pages/consumer/ScanBadge';
import MyInvestments from './pages/consumer/MyInvestments';
import FundFarmer from './pages/consumer/FundFarmer';
import BatchTrace from './pages/consumer/BatchTrace';

import FRSVerification from './pages/retailer/FRSVerification';

import AdminDashboard from './pages/admin/AdminDashboard';
import SubsidyControl from './pages/admin/SubsidyControl';
import BadActors from './pages/admin/BadActors';
import NetworkInventory from './pages/admin/NetworkInventory';
import DisputePanelPage from './pages/admin/DisputePanel';

// Using RoleLayout generically for all roles
const FarmerLayout = RoleLayout;
const RetailerLayout = RoleLayout;
const ConsumerLayout = RoleLayout;
const AdminLayout = RoleLayout;
const DisputeLayout = RoleLayout;

function ProtectedRoute({ element, roles }) {
  const { user, isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/unauthorized" />;
  }
  
  return element;
}

export default function App() {
  const addEvent = useBatchStore(s => s.addEvent);
  const updateBatch = useBatchStore(s => s.updateBatch);
  
  useEffect(() => {
    wsClient.connect();
    
    const usC = wsClient.subscribe('CUSTODY_TRANSFER', (data) => { 
      addEvent({ type: 'CUSTODY_TRANSFER', ...data }); 
      updateBatch(data.batchId, data); 
    });
    const usB = wsClient.subscribe('BATCH_CREATED', (data) => addEvent({ type: 'BATCH_CREATED', ...data }));
    const usF = wsClient.subscribe('FRS_ALERT', (data) => addEvent({ type: 'FRS_ALERT', ...data }));
    const usD = wsClient.subscribe('DISPUTE_CREATED', (data) => addEvent({ type: 'DISPUTE_CREATED', ...data }));
    const usS = wsClient.subscribe('SUBSIDY_DISBURSED', (data) => addEvent({ type: 'SUBSIDY_DISBURSED', ...data }));

    return () => {
      usC(); usB(); usF(); usD(); usS();
    };
  }, [addEvent, updateBatch]);
  
  return (
    <BrowserRouter>
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' } 
        }} 
      />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Public/Trace Route */}
        <Route path="/trace/:batchId" element={<BatchTrace />} />
        
        {/* Role Protected Layouts */}
        <Route path="/farmer" element={<ProtectedRoute element={<FarmerLayout />} roles={['FARMER']} />}>
          <Route index element={<RegisterProduce />} />
          <Route path="register" element={<RegisterProduce />} />
          <Route path="batches" element={<MyBatches />} />
          <Route path="funding" element={<FundingRequests />} />
          <Route path="insurance" element={<InsurancePool />} />
        </Route>
        
        <Route path="/retailer" element={<ProtectedRoute element={<RetailerLayout />} roles={['RETAILER']} />}>
          <Route path="*" element={<FRSVerification />} />
          <Route index element={<FRSVerification />} />
          <Route path="verify" element={<FRSVerification />} />
        </Route>
        
        <Route path="/middleman" element={<ProtectedRoute element={<RoleLayout />} roles={['MIDDLEMAN']} />}>
          {/* Middleman doesn't have custom views implemented yet, defaulting back to list */}
          <Route path="*" element={<div className="p-8 text-farm-text">Middleman View Pending</div>} />
        </Route>
        
        <Route path="/consumer" element={<ProtectedRoute element={<ConsumerLayout />} roles={['CONSUMER']} />}>
          <Route index element={<ScanBadge />} />
          <Route path="scan" element={<ScanBadge />} />
          <Route path="fund" element={<FundFarmer />} />
          <Route path="investments" element={<MyInvestments />} />
        </Route>
        
        <Route path="/admin" element={<ProtectedRoute element={<AdminLayout />} roles={['ADMIN']} />}>
          <Route index element={<AdminDashboard />} />
          <Route path="disputes" element={<DisputePanelPage />} />
          <Route path="subsidy-pool" element={<SubsidyControl />} />
          <Route path="bad-actors" element={<BadActors />} />
          <Route path="inventory" element={<NetworkInventory />} />
          <Route path="*" element={<AdminDashboard />} />
        </Route>
        
        <Route path="/disputes" element={<ProtectedRoute element={<DisputeLayout />} roles={['PANEL_MEMBER', 'ADMIN']} />}>
          <Route index element={<DisputePanelPage />} />
          <Route path="*" element={<DisputePanelPage />} />
        </Route>
        
        {/* Unauthorized Route */}
        <Route path="/unauthorized" element={
          <div className="flex flex-col items-center justify-center min-h-screen bg-farm-bg p-20 text-farm-red text-xl font-bold font-display">
            <span className="text-6xl mb-6">🚫</span>
            Access Denied
            <p className="text-sm font-normal text-farm-muted mt-2">You do not have the required permissions to view this node.</p>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}
