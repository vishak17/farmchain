import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { Link as LinkIcon, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore(s => s.setAuth);
  const navigate = useNavigate();

  const handleLogin = async (e, quickEmail, quickPwd) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const { data } = await login(quickEmail || email, quickPwd || password);
      setAuth(data.user, data.token);
      
      const roleMap = {
        FARMER: '/farmer',
        RETAILER: '/retailer',
        MIDDLEMAN: '/middleman',
        CONSUMER: '/consumer',
        ADMIN: '/admin',
        PANEL_MEMBER: '/disputes'
      };
      navigate(roleMap[data.user.role] || '/');
      toast.success('Login successful!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-farm-bg font-display">
      {/* Left Branding Side */}
      <div className="hidden lg:flex w-1/2 relative bg-[#0f172a] border-r border-farm-border p-12 flex-col justify-center items-center overflow-hidden">
        {/* Animated Background Nodes */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          {Array.from({ length: 25 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-farm-green"
              initial={{ x: Math.random() * window.innerWidth / 2, y: Math.random() * window.innerHeight, opacity: 0.1 }}
              animate={{ 
                x: Math.random() * window.innerWidth / 2, 
                y: Math.random() * window.innerHeight,
                opacity: [0.1, 0.8, 0.1] 
              }}
              transition={{ duration: 8 + Math.random() * 8, repeat: Infinity, ease: 'linear' }}
            />
          ))}
        </div>
        
        <div className="z-10 text-center flex flex-col items-center">
          <div className="flex justify-center mb-6 bg-farm-surface-2 p-6 rounded-3xl border border-farm-border shadow-2xl">
            <LinkIcon size={80} className="text-farm-green" />
          </div>
          <h1 className="text-5xl font-bold text-farm-text mb-6 tracking-tight">FarmChain</h1>
          <p className="text-xl text-farm-green-light font-mono bg-farm-green/10 px-6 py-2 rounded-full border border-farm-green/20">
            Transparent. Accountable. Trusted.
          </p>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-farm-text">Welcome Back</h2>
            <p className="text-farm-muted mt-2">Sign in to your FarmChain node</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 mt-8">
            <div>
              <label className="block text-sm font-medium text-farm-muted mb-2">Email Node</label>
              <input 
                type="email" 
                className="input" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                placeholder="node@farmchain.local"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-farm-muted mb-2">Private Key (Password)</label>
              <input 
                type="password" 
                className="input" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary flex justify-center items-center h-12">
              {loading ? <Loader2 className="animate-spin" /> : 'Authenticate'}
            </button>
          </form>

          <p className="text-center text-sm text-farm-muted">
            New to the network? <Link to="/register" className="text-farm-green hover:underline">Register Node</Link>
          </p>

          <div className="mt-10 pt-6 border-t border-farm-border">
            <p className="text-xs text-center text-farm-muted mb-4 uppercase tracking-widest font-bold">Demo Quick Access</p>
            <div className="space-y-3">
              <button 
                type="button"
                onClick={() => handleLogin(null, 'raju@farm.com', 'farmchain123')} 
                className="w-full btn-ghost text-sm border-farm-border hover:border-farm-green hover:text-farm-green transition-colors"
              >
                Login as Farmer
              </button>
              <button 
                type="button"
                onClick={() => handleLogin(null, 'consumer1@user.com', 'farmchain123')} 
                className="w-full btn-ghost text-sm border-farm-border hover:border-farm-blue hover:text-farm-blue transition-colors"
              >
                Login as Consumer
              </button>
              <button 
                type="button"
                onClick={() => handleLogin(null, 'admin@farmchain.com', 'farmchain123')} 
                className="w-full btn-ghost text-sm border-farm-border hover:border-farm-amber hover:text-farm-amber transition-colors"
              >
                Login as Network Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
