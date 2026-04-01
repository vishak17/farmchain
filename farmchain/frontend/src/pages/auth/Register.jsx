import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { Link as LinkIcon, Loader2 } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'FARMER', village: '', state: ''
  });
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore(s => s.setAuth);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await register(formData);
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
      toast.success('Node registered on FarmChain successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-farm-bg p-4 flex-col font-display">
      <div className="flex items-center gap-2 mb-8 bg-farm-surface-2 px-6 py-3 rounded-2xl border border-farm-border">
        <LinkIcon size={32} className="text-farm-green" />
        <h1 className="text-3xl font-bold text-farm-text tracking-tight">FarmChain</h1>
      </div>

      <div className="card w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-bold text-farm-text mb-6 text-center">Join the Network</h2>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-farm-muted mb-1">Entity Name</label>
            <input type="text" name="name" className="input" required value={formData.name} onChange={handleChange} placeholder="Raju Farms Ltd." />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-farm-muted mb-1">Email Node</label>
            <input type="email" name="email" className="input" required value={formData.email} onChange={handleChange} placeholder="contact@rajufarms.com" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-farm-muted mb-1">Private Key (Password)</label>
            <input type="password" name="password" className="input" required value={formData.password} onChange={handleChange} placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-farm-muted mb-1">Network Role</label>
            <select name="role" className="input bg-farm-surface-2 pr-8" value={formData.role} onChange={handleChange}>
              <option value="FARMER">Farmer (Producer)</option>
              <option value="MIDDLEMAN">Middleman (Logistics)</option>
              <option value="RETAILER">Retailer (Distributor)</option>
              <option value="CONSUMER">Consumer (End User)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-farm-muted mb-1">Village/City</label>
              <input type="text" name="village" className="input" value={formData.village} onChange={handleChange} placeholder="Nashik" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-farm-muted mb-1">State</label>
              <input type="text" name="state" className="input" value={formData.state} onChange={handleChange} placeholder="Maharashtra" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full btn-primary mt-6 flex justify-center h-12 items-center text-lg shadow-lg">
            {loading ? <Loader2 className="animate-spin" /> : 'Register Node'}
          </button>
        </form>

        <p className="text-center text-sm text-farm-muted mt-6 pt-6 border-t border-farm-border">
          Already have a node? <Link to="/login" className="text-farm-green font-bold hover:underline">Authenticate Here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
