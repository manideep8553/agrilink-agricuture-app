import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { FiMenu, FiX, FiShoppingCart, FiLogOut, FiUser } from 'react-icons/fi';
import PriceAlertBell from './PriceAlertBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLanding = location.pathname === '/';
  const bgClass = isLanding ? 'bg-transparent' : 'glass border-b border-forest-200/20';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = user?.role === 'FARMER'
    ? [{ to: '/farmer/dashboard', label: 'Dashboard' }, { to: '/prices', label: 'Prices' }, { to: '/chat', label: 'Chat' }]
    : user?.role === 'RETAIL_BUYER'
    ? [{ to: '/buyer/dashboard', label: 'Marketplace' }, { to: '/prices', label: 'Prices' }, { to: '/chat', label: 'Chat' }]
    : [{ to: '/prices', label: 'Crop Prices' }, { to: '/login', label: 'Login' }];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${bgClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl">🌾</span>
            <span className="font-heading text-xl font-bold text-forest-700">AgriLink</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to}
                className={`text-sm font-medium transition-colors ${location.pathname === link.to ? 'text-amber-500' : 'text-forest-700 hover:text-amber-500'}`}>
                {link.label}
              </Link>
            ))}

            {user && (
              <>
                <PriceAlertBell />
                {user.role === 'RETAIL_BUYER' && (
                  <button className="text-forest-700 hover:text-amber-500 transition-colors">
                    <FiShoppingCart size={18} />
                  </button>
                )}
                <div className="flex items-center space-x-3 pl-3 border-l border-forest-200/40">
                  <Link to="/profile" className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-forest-600 to-amber-500 flex items-center justify-center text-white text-xs font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-forest-700 leading-tight">{user.name.split(' ')[0]}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${user.role === 'FARMER' ? 'bg-amber-100 text-amber-700' : 'bg-forest-100 text-forest-700'}`}>
                        {user.role === 'FARMER' ? 'Farmer' : 'Buyer'}
                      </span>
                    </div>
                  </Link>
                  <button onClick={handleLogout} className="text-forest-400 hover:text-terracotta-500 transition-colors">
                    <FiLogOut size={16} />
                  </button>
                </div>
              </>
            )}
          </div>

          <button className="md:hidden text-forest-700" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-forest-200/20 overflow-hidden">
            <div className="px-4 py-4 space-y-3">
              {navLinks.map(link => (
                <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}
                  className="block text-sm font-medium text-forest-700 hover:text-amber-500">{link.label}</Link>
              ))}
              {user && (
                <button onClick={handleLogout} className="flex items-center space-x-2 text-sm text-terracotta-500 font-medium">
                  <FiLogOut size={16} /><span>Logout</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
