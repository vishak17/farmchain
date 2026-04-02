import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../../services/api';
import { connectAndSignIn, getConnectedAccount, checkWalletRegistration } from '../../services/walletAuth';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { Link as LinkIcon, Loader2, Wallet, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ROLE_MAP = {
  FARMER: '/farmer',
  RETAILER: '/retailer',
  MIDDLEMAN: '/middleman',
  CONSUMER: '/consumer',
  ADMIN: '/admin',
  PANEL_MEMBER: '/disputes',
};

const WALLET_ROLES = [
  {
    role: 'FARMER',
    label: 'Connect as Farmer',
    color: 'farm-green',
    hoverBorder: 'hover:border-farm-green',
    hoverText: 'hover:text-farm-green',
    activeBg: 'bg-farm-green/10 border-farm-green text-farm-green',
    icon: '🌾',
    desc: 'Mint produce batches & manage supply'
  },
  {
    role: 'CONSUMER',
    label: 'Connect as Consumer',
    color: 'farm-blue',
    hoverBorder: 'hover:border-farm-blue',
    hoverText: 'hover:text-farm-blue',
    activeBg: 'bg-farm-blue/10 border-farm-blue text-farm-blue',
    icon: '🛒',
    desc: 'Trace produce & fund farmers'
  },
  {
    role: 'ADMIN',
    label: 'Connect as Network Admin',
    color: 'farm-amber',
    hoverBorder: 'hover:border-farm-amber',
    hoverText: 'hover:text-farm-amber',
    activeBg: 'bg-farm-amber/10 border-farm-amber text-farm-amber',
    icon: '🔑',
    desc: 'Manage network & disputes'
  },
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // walletLoading = role string currently connecting, or null
  const [walletLoading, setWalletLoading] = useState(null);
  // connectedAccount = detected MetaMask address (no prompt)
  const [connectedAccount, setConnectedAccount] = useState(null);
  // accountInfo = { registered, role, lockedAt } from wallet-check
  const [accountInfo, setAccountInfo] = useState(null);

  const setAuth = useAuthStore(s => s.setAuth);
  const navigate = useNavigate();

  // ── Detect if MetaMask already has a connected account (no popup) ──────
  useEffect(() => {
    getConnectedAccount().then(addr => {
      if (addr) {
        setConnectedAccount(addr);
        checkWalletRegistration(addr).then(setAccountInfo);
      }
    });

    if (window.ethereum) {
      const handleChange = (accounts) => {
        const addr = accounts[0] || null;
        setConnectedAccount(addr);
        setAccountInfo(null);
        if (addr) checkWalletRegistration(addr).then(setAccountInfo);
      };
      window.ethereum.on('accountsChanged', handleChange);
      return () => window.ethereum.removeListener('accountsChanged', handleChange);
    }
  }, []);

  // ── Email / password login (unchanged) ────────────────────────────────
  const handleLogin = async (e, quickEmail, quickPwd) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const { data } = await login(quickEmail || email, quickPwd || password);
      setAuth(data.user, data.token);
      navigate(ROLE_MAP[data.user.role] || '/');
      toast.success('Login successful!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Wallet connect + sign-in ──────────────────────────────────────────
  const handleWalletLogin = async (role) => {
    if (!window.ethereum) {
      toast.error('MetaMask not detected. Install it at metamask.io then refresh.', { duration: 5000 });
      return;
    }
    setWalletLoading(role);
    try {
      const data = await connectAndSignIn(role);
      setAuth(data.user, data.token);
      toast.success(
        `Wallet connected as ${data.user.role} 🔗`,
        { icon: '🔒', duration: 4000 }
      );
      navigate(ROLE_MAP[data.user.role] || '/');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Wallet connection failed';
      // Role-lock errors deserve a special treatment
      if (err.response?.status === 403) {
        const boundRole = err.response.data?.boundRole;
        toast.error(
          `🔒 Role Locked\n\nThis wallet is permanently bound to ${boundRole}.`,
          { duration: 7000 }
        );
      } else {
        toast.error(msg, { duration: 5000 });
      }
    } finally {
      setWalletLoading(null);
    }
  };

  const hasMetaMask = !!window.ethereum;

  return (
    <div className="min-h-screen flex bg-farm-bg font-display">

      {/* ── Left Branding Side ─────────────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 relative bg-[#0f172a] border-r border-farm-border p-12 flex-col justify-center items-center overflow-hidden">
        {/* Animated blockchain nodes */}
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

          {/* Show detected account */}
          <AnimatePresence>
            {connectedAccount && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-8 p-4 bg-farm-surface-2 border border-farm-green/30 rounded-xl text-sm w-full max-w-xs"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-farm-green animate-pulse" />
                  <span className="text-farm-green font-bold text-xs uppercase tracking-widest">Wallet Detected</span>
                </div>
                <p className="font-mono text-farm-muted truncate">{connectedAccount}</p>
                {accountInfo?.registered && (
                  <div className="flex items-center gap-1.5 mt-2 text-farm-amber text-xs font-bold">
                    <ShieldCheck size={12} />
                    Bound to role: {accountInfo.role}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Right Form Side ────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative overflow-y-auto">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-farm-text">Welcome Back</h2>
            <p className="text-farm-muted mt-2">Sign in to your FarmChain node</p>
          </div>

          {/* ── Email Login ─────────────────────────────────────────── */}
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

          {/* ── Wallet Connect Section ──────────────────────────────── */}
          <div className="mt-10 pt-6 border-t border-farm-border">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Wallet size={14} className="text-farm-muted" />
              <p className="text-xs text-center text-farm-muted uppercase tracking-widest font-bold">
                Connect Wallet to FarmChain
              </p>
            </div>

            {/* MetaMask not found warning */}
            {!hasMetaMask && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 p-3 bg-farm-amber/10 border border-farm-amber/30 rounded-lg mb-4 text-xs text-farm-amber"
              >
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>
                  MetaMask not detected.{' '}
                  <a href="https://metamask.io" target="_blank" rel="noreferrer" className="underline font-bold">
                    Install MetaMask
                  </a>{' '}
                  to use wallet login.
                </span>
              </motion.div>
            )}

            {/* Pre-connected account role-lock badge */}
            <AnimatePresence>
              {connectedAccount && accountInfo?.registered && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 p-3 bg-farm-green/10 border border-farm-green/30 rounded-lg mb-4 text-xs text-farm-green"
                >
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>
                    <strong>{connectedAccount.slice(0,8)}…</strong> is registered as{' '}
                    <strong className="uppercase">{accountInfo.role}</strong>.
                    Click your role below to sign in.
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3 mt-4">
              {WALLET_ROLES.map(({ role, label, hoverBorder, hoverText, activeBg, icon, desc }) => {
                const isConnecting = walletLoading === role;
                // If this address is locked to a DIFFERENT role, dim the button
                const isLocked = accountInfo?.registered && accountInfo.role !== role;

                return (
                  <motion.button
                    key={role}
                    type="button"
                    whileHover={!isLocked && !walletLoading ? { scale: 1.01 } : {}}
                    whileTap={!isLocked && !walletLoading ? { scale: 0.99 } : {}}
                    onClick={() => !isLocked && handleWalletLogin(role)}
                    disabled={!!walletLoading || isLocked}
                    className={`
                      w-full btn-ghost text-sm border-farm-border transition-all duration-200
                      flex items-center justify-between px-4 py-3 group relative overflow-hidden
                      ${!walletLoading && !isLocked ? `${hoverBorder} ${hoverText}` : ''}
                      ${isConnecting ? activeBg : ''}
                      ${isLocked ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-lg">{icon}</span>
                      <span className="flex flex-col items-start">
                        <span className="font-bold">{label}</span>
                        <span className="text-[10px] text-farm-muted font-normal group-hover:text-current transition-colors">{desc}</span>
                      </span>
                    </span>

                    <span className="flex items-center gap-2">
                      {isConnecting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span className="text-xs">Connecting…</span>
                        </>
                      ) : (
                        <Wallet size={14} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                      )}
                    </span>

                    {/* Shimmer effect while connecting */}
                    {isConnecting && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            <p className="text-center text-[10px] text-farm-muted mt-4 flex items-center justify-center gap-1">
              <ShieldCheck size={10} />
              Role is permanently locked to wallet address on first connect
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
