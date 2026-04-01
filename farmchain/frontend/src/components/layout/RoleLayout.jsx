import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import wsClient from '../../services/websocket';
import { 
  Menu, Link as LinkIcon, LogOut, Bell, 
  LayoutDashboard, Tractor, Package, CircleDollarSign, Shield,
  Truck, ClipboardCheck, ArrowRightLeft, Target, 
  Map, Scale, AlertTriangle, Activity
} from 'lucide-react';
import { format } from 'date-fns';

const roleNavConfig = {
  FARMER: [
    { label: 'Dashboard', path: '/farmer', icon: LayoutDashboard },
    { label: 'Register Produce', path: '/farmer/register', icon: Tractor },
    { label: 'My Batches', path: '/farmer/batches', icon: Package },
    { label: 'Funding Requests', path: '/farmer/funding', icon: CircleDollarSign },
    { label: 'Insurance Pool', path: '/farmer/insurance', icon: Shield },
  ],
  RETAILER: [
    { label: 'Dashboard', path: '/retailer', icon: LayoutDashboard },
    { label: 'Receive Delivery', path: '/retailer/receive', icon: Truck },
    { label: 'FRS Verification', path: '/retailer/verify', icon: ClipboardCheck },
    { label: 'My Transactions', path: '/retailer/transactions', icon: ArrowRightLeft },
  ],
  MIDDLEMAN: [
    { label: 'Dashboard', path: '/middleman', icon: LayoutDashboard },
    { label: 'Batch Aggregation', path: '/middleman/batch', icon: Package },
    { label: 'My Rating (MRQA)', path: '/middleman/rating', icon: Target },
  ],
  CONSUMER: [
    { label: 'Dashboard', path: '/consumer', icon: LayoutDashboard },
    { label: 'Scan Batch', path: '/consumer/scan', icon: Map },
    { label: 'Fund a Farmer', path: '/consumer/fund', icon: CircleDollarSign },
    { label: 'My Investments', path: '/consumer/investments', icon: Shield },
  ],
  ADMIN: [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Network Map', path: '/admin/network', icon: Map },
    { label: 'Disputes', path: '/admin/disputes', icon: Scale },
    { label: 'Subsidy Control', path: '/admin/subsidy', icon: CircleDollarSign },
    { label: 'Bad Actors', path: '/admin/bad-actors', icon: AlertTriangle },
    { label: 'Simulation', path: '/admin/simulation', icon: Activity },
  ],
  PANEL_MEMBER: [
    { label: 'Dashboard', path: '/disputes', icon: LayoutDashboard },
    { label: 'Open Disputes', path: '/disputes/open', icon: Scale },
  ]
};

const RoleLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [wsConnected, setWsConnected] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const userRole = user?.role || 'FARMER';
  const navItems = roleNavConfig[userRole] || [];
  
  const currentNav = navItems.find(n => n.path === location.pathname) 
    || navItems.find(n => location.pathname.startsWith(n.path) && n.path !== `/${userRole.toLowerCase()}`) 
    || navItems[0];

  useEffect(() => {
    const unsub = wsClient.subscribe('CONNECTION_STATUS', (data) => setWsConnected(data.connected));
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => { unsub(); clearInterval(timer); };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-farm-bg font-display overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-[#0f172a] flex flex-col transition-all duration-300 border-r border-farm-border`}>
        <div className="h-16 flex items-center justify-center border-b border-farm-border cursor-pointer hover:bg-farm-surface-2 transition-colors" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <LinkIcon className="text-farm-green" size={24} />
          {sidebarOpen && <span className="ml-2 font-bold text-xl tracking-wide text-farm-text">FarmChain</span>}
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-2 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === `/${userRole.toLowerCase()}`}
                    className={({ isActive }) => 
                      `flex items-center p-3 rounded-lg transition-colors group ${
                        isActive ? 'bg-farm-green/10 text-farm-green-light border border-farm-green/20' : 'text-farm-muted hover:bg-farm-surface-2 hover:text-farm-text'
                      }`
                    }
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3 font-medium whitespace-nowrap">{item.label}</span>}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-farm-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-farm-surface-3 flex items-center justify-center text-farm-green-light font-bold flex-shrink-0 uppercase">
              {user?.name?.charAt(0) || userRole.charAt(0)}
            </div>
            {sidebarOpen && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-farm-text truncate">{user?.name || 'User'}</span>
                <span className="text-[10px] font-bold tracking-wider text-farm-green px-1.5 py-0.5 rounded bg-farm-green/10 w-fit mt-1">{userRole}</span>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="flex items-center w-full p-2 rounded-lg text-farm-red hover:bg-farm-red/10 transition-colors">
            <LogOut size={20} className="flex-shrink-0" />
            {sidebarOpen && <span className="ml-3 font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex flex-shrink-0 items-center justify-between px-6 bg-farm-surface/50 backdrop-blur-md border-b border-farm-border">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 -ml-2 text-farm-muted hover:text-farm-text md:hidden">
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-bold text-farm-text">{currentNav?.label || 'Dashboard'}</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex text-sm font-mono text-farm-muted">
              {format(currentTime, "MMM d, yyyy | HH:mm 'IST'")}
            </div>
            
            <div className="flex items-center gap-2" title={wsConnected ? 'Connected to Network' : 'Disconnected'}>
              <span className={`w-2.5 h-2.5 rounded-full ${wsConnected ? 'bg-farm-green animate-pulse-slow' : 'bg-farm-muted'}`}></span>
              <span className="text-xs text-farm-muted hidden sm:inline">{wsConnected ? 'Live' : 'Offline'}</span>
            </div>

            <button className="relative text-farm-muted hover:text-farm-text">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-farm-amber text-[10px] font-bold text-white flex items-center justify-center">
                3
              </span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-farm-bg">
          <Outlet /> {/* Renders the nested routes */}
        </div>
      </main>
    </div>
  );
};

export default RoleLayout;
