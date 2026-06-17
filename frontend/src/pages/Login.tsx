import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiLock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate(user.role === 'FARMER' ? '/farmer/dashboard' : '/buyer/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="glass rounded-3xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <span className="text-4xl">🌾</span>
            <h1 className="text-3xl font-heading font-bold text-forest-700 mt-2">Welcome Back</h1>
            <p className="text-forest-500 text-sm mt-1">Sign in to your AgriLink account</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-forest-700 mb-1.5">Email</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" size={16} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-sm"
                  placeholder="you@example.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-forest-700 mb-1.5">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" size={16} />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-forest-200 bg-white/50 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-sm"
                  placeholder="••••••••" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-forest-700 hover:bg-forest-800 text-cream font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg shadow-forest-700/20">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-sm text-forest-500 mt-6">
            Don't have an account? <Link to="/register" className="text-amber-500 hover:text-amber-600 font-medium">Create one</Link>
          </p>
          <div className="mt-6 pt-6 border-t border-forest-200/30">
            <p className="text-xs text-forest-400 text-center mb-3">Demo credentials</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button onClick={() => { setEmail('farmer@agrilink.com'); setPassword('farmer123'); }}
                className="px-3 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-center">
                Farmer Login
              </button>
              <button onClick={() => { setEmail('buyer@agrilink.com'); setPassword('buyer123'); }}
                className="px-3 py-2 bg-forest-50 text-forest-700 rounded-lg hover:bg-forest-100 transition-colors text-center">
                Buyer Login
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
