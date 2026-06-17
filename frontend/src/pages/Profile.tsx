import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiMapPin, FiShield, FiFeather, FiEdit2, FiSave } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { INDIAN_STATES } from '../utils/helpers';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', state: '', district: '', bio: '', isOrganic: false,
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        state: user.state || '',
        district: user.district || '',
        bio: user.bio || '',
        isOrganic: user.isOrganic || false,
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      const { data } = await api.put('/users/profile', form);
      updateUser(data.user);
      toast.success('Profile updated');
      setEditing(false);
    } catch (err) { toast.error('Failed to update'); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pt-20 pb-10 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Profile Card */}
          <div className="glass rounded-3xl p-8">
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-forest-500 to-amber-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                {user.name.charAt(0)}
              </div>
              {editing ? (
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="text-2xl font-heading font-bold text-center text-forest-700 bg-transparent border-b border-forest-200 focus:border-amber-500 outline-none" />
              ) : (
                <h1 className="text-2xl font-heading font-bold text-forest-700">{user.name}</h1>
              )}
              <div className="flex items-center justify-center space-x-2 mt-2">
                <span className={`px-3 py-0.5 rounded-full text-xs font-medium ${user.role === 'FARMER' ? 'bg-amber-100 text-amber-700' : 'bg-forest-100 text-forest-700'}`}>
                  {user.role === 'FARMER' ? '🌾 Farmer' : '🛒 Retail Buyer'}
                </span>
                {user.isVerified && <span className="flex items-center text-xs text-green-600"><FiShield className="mr-1" />Verified</span>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-forest-50/50">
                <FiMail className="text-forest-400" size={16} />
                <span className="text-sm text-forest-600">{user.email}</span>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-forest-50/50">
                <FiPhone className="text-forest-400" size={16} />
                {editing ? (
                  <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                    className="text-sm text-forest-600 bg-transparent border-b border-forest-200 focus:border-amber-500 outline-none flex-1" />
                ) : (
                  <span className="text-sm text-forest-600">{user.phone || 'Not provided'}</span>
                )}
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-forest-50/50">
                <FiMapPin className="text-forest-400" size={16} />
                {editing ? (
                  <div className="flex space-x-2 flex-1">
                    <select value={form.state} onChange={e => setForm({...form, state: e.target.value})}
                      className="text-sm bg-transparent border-b border-forest-200 focus:border-amber-500 outline-none flex-1">
                      <option value="">State</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input type="text" value={form.district} onChange={e => setForm({...form, district: e.target.value})}
                      className="text-sm bg-transparent border-b border-forest-200 focus:border-amber-500 outline-none flex-1"
                      placeholder="District" />
                  </div>
                ) : (
                  <span className="text-sm text-forest-600">{user.district || user.state || 'Location not set'}</span>
                )}
              </div>
              {(user.role === 'FARMER' || editing) && (
                <div className="p-3 rounded-xl bg-forest-50/50">
                  <div className="flex items-center space-x-3 mb-2">
                    <FiFeather className="text-forest-400" size={16} />
                    <span className="text-sm text-forest-600">Bio</span>
                  </div>
                  {editing ? (
                    <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} rows={3}
                      className="w-full text-sm text-forest-600 bg-white/50 rounded-lg p-2 border border-forest-200 focus:border-amber-500 outline-none resize-none mt-2" />
                  ) : (
                    <p className="text-sm text-forest-600 ml-9">{user.bio || 'No bio yet'}</p>
                  )}
                </div>
              )}
              {editing && user.role === 'FARMER' && (
                <label className="flex items-center space-x-3 p-3 rounded-xl bg-forest-50/50">
                  <input type="checkbox" checked={form.isOrganic} onChange={e => setForm({...form, isOrganic: e.target.checked})}
                    className="w-4 h-4 rounded border-forest-300 text-forest-700 focus:ring-forest-500" />
                  <span className="text-sm text-forest-600">Organic Certified Farmer</span>
                </label>
              )}
            </div>

            {/* Trust Score Bar (Farmers) */}
            {user.role === 'FARMER' && (
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-forest-50 to-amber-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-forest-700 flex items-center"><FiShield className="mr-1 text-amber-500" />Trust Score</span>
                  <span className="text-lg font-heading font-bold text-forest-700">{user.trustScore}/100</span>
                </div>
                <div className="w-full h-2 rounded-full bg-forest-200 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-terracotta-500 via-amber-500 to-green-500 transition-all duration-500"
                    style={{ width: `${user.trustScore}%` }} />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex space-x-3">
              {editing ? (
                <>
                  <button onClick={handleSave} className="flex-1 py-2.5 bg-forest-700 hover:bg-forest-800 text-cream font-medium rounded-xl transition-all flex items-center justify-center space-x-2">
                    <FiSave size={16} /><span>Save</span>
                  </button>
                  <button onClick={() => setEditing(false)} className="flex-1 py-2.5 border border-forest-200 text-forest-600 font-medium rounded-xl hover:bg-forest-50 transition-all">
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="flex-1 py-2.5 bg-forest-700 hover:bg-forest-800 text-cream font-medium rounded-xl transition-all flex items-center justify-center space-x-2">
                  <FiEdit2 size={16} /><span>Edit Profile</span>
                </button>
              )}
              <button onClick={() => { logout(); navigate('/'); }}
                className="px-4 py-2.5 border border-terracotta-200 text-terracotta-600 font-medium rounded-xl hover:bg-terracotta-50 transition-all">
                Logout
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
