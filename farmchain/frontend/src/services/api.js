import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 15000
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('farmchain_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('farmchain_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');

// Farmer
export const registerProduce = (data) => api.post('/farmer/register-produce', data);
export const getFarmerBatches = () => api.get('/farmer/batches');
export const getInsurancePool = () => api.get('/farmer/insurance-pool');
export const createFundingRequest = (data) => api.post('/farmer/funding/create', data);
export const settleHarvest = (id, data) => api.post(`/farmer/funding/${id}/settle`, data);

// Batch
export const getBatch = (id) => api.get(`/batch/${id}`);
export const getBatchQR = (id) => api.get(`/batch/${id}/qr`);
export const recordCustody = (data) => api.post('/batch/custody-transfer', data);
export const getNetworkInventory = (produce) => api.get(`/batch/network/inventory?produce=${produce}`);

// Consumer
export const traceConsumer = (id) => api.get(`/consumer/trace/${id}`);
export const reportQuality = (id, data) => api.post(`/consumer/report/${id}`, data);
export const getFundingMarketplace = () => api.get('/consumer/funding/marketplace');
export const investInFarmer = (id, data) => api.post(`/consumer/funding/${id}/invest`, data);
export const getMyInvestments = () => api.get('/consumer/investments');

// Dispute
export const createDispute = (data) => api.post('/dispute/create', data);
export const submitEvidence = (id, formData) => api.post(`/dispute/${id}/evidence`, formData, { headers: {'Content-Type': 'multipart/form-data'} });
export const castVote = (id, vote) => api.post(`/dispute/${id}/vote`, { vote });
export const getDispute = (id) => api.get(`/dispute/${id}`);
export const getOpenDisputes = () => api.get('/dispute/open');

// Subsidy
export const getSubsidyQueue = () => api.get('/subsidy/queue');
export const depositSubsidy = (data) => api.post('/subsidy/deposit', data);
export const processSubsidy = (batchSize) => api.post('/subsidy/process', { batchSize });
export const getSubsidyStats = () => api.get('/subsidy/stats');

// Admin
export const getAdminDashboard = () => api.get('/admin/dashboard');
export const getBadActors = () => api.get('/admin/bad-actors');
export const blacklistNode = (data) => api.post('/admin/blacklist', data);
export const triggerSimulation = () => api.post('/admin/simulation/trigger');

export default api;
