import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiLock, FiPhone, FiMapPin } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { INDIAN_STATES } from '../utils/helpers';

export default function Register() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: searchParams.get('role') || 'FARMER',
    state: '',
    district: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome to AgriLink.');
      navigate(form.role === 'FARMER' ? '/farmer/dashboard' : '/buyer/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="glass rounded-3xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <span className="text-4xl">🌱</span>
            <h1 className="text-3xl font-heading font-bold text-forest-700 mt-2">Join AgriLink</h1>
            <p className="text-forest-500 text-sm mt-1">Create your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-forest-700 mb-1.5">I am a...</label>
              <div className="grid grid-cols-2 gap-3">
                {['FARMER', 'RETAIL_BUYER'].map(role => (
                  <button key={role} type="button" onClick={() => updateForm('role', role)}
                    className={`py-2.5 px-4 rounded-xl text-sm font-medium border transition-all ${form.role === role ? 'bg-forest-700 text-cream border-forest-700' : 'bg-white/50 text-forest-600 border-forest-200 hover:border-forest-400'}`}>
                    {role === 'FARMER' ? '🌾 Farmer' : '🛒 Retail Buyer'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-forest-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" size={14} />
                  <input type="text" value={form.name} onChange={e => updateForm('name', e.target.value)} required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-sm"
                    placeholder="John Doe" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-forest-700 mb-1.5">Email</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" size={14} />
                  <input type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 transition-all text-sm"
                    placeholder="john@example.com" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-forest-700 mb-1.5">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" size={14} />
                  <input type="password" value={form.password} onChange={e => updateForm('password', e.target.value)} required minLength={6}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 transition-all text-sm"
                    placeholder="Min 6 chars" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-forest-700 mb-1.5">Phone</label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" size={14} />
                  <input type="tel" value={form.phone} onChange={e => updateForm('phone', e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 transition-all text-sm"
                    placeholder="+91-9876543210" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-forest-700 mb-1.5">State</label>
                <div className="relative">
                  <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" size={14} />
                  <select value={form.state} onChange={e => updateForm('state', e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 transition-all text-sm appearance-none">
                    <option value="">Select state</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-forest-700 mb-1.5">District</label>
                <input type="text" value={form.district} onChange={e => updateForm('district', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 transition-all text-sm"
                  placeholder="Your district" />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-forest-900 font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg shadow-amber-500/20">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-forest-500 mt-6">
            Already have an account? <Link to="/login" className="text-amber-500 hover:text-amber-600 font-medium">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
