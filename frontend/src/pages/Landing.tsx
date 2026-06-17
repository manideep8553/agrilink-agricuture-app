import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiTrendingUp, FiUsers, FiShield, FiFeather, FiMapPin } from 'react-icons/fi';

const crops = ['🌾', '🌽', '🍅', '🧅', '🥔', '🥭', '🍌', '🌶️'];

export default function Landing() {
  const [currentCrop, setCurrentCrop] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCrop(prev => (prev + 1) % crops.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-forest-900 via-forest-800 to-forest-700" />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23F59E0B' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        
        {/* Floating crop emoji */}
        <div className="absolute top-1/4 right-[15%] text-7xl animate-float opacity-30 hidden lg:block">{crops[currentCrop]}</div>
        <div className="absolute bottom-1/3 left-[10%] text-5xl animate-float opacity-20 hidden lg:block" style={{ animationDelay: '1s' }}>{crops[(currentCrop + 2) % crops.length]}</div>
        <div className="absolute top-1/3 left-[20%] text-4xl animate-float opacity-15 hidden lg:block" style={{ animationDelay: '0.5s' }}>{crops[(currentCrop + 4) % crops.length]}</div>
        <div className="absolute bottom-1/4 right-[10%] text-6xl animate-float opacity-20 hidden lg:block" style={{ animationDelay: '1.5s' }}>{crops[(currentCrop + 6) % crops.length]}</div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
          <div className="max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-6">
                🌱 Direct Farm-to-Market Platform
              </span>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading text-cream leading-tight mb-6">
                Fresh From
                <span className="block text-gradient">Farm to Table</span>
              </h1>
              <p className="text-lg md:text-xl text-forest-200 max-w-xl mb-10 leading-relaxed">
                India's premium agriculture marketplace connecting farmers directly with retail buyers. 
                Fair prices, fresh produce, transparent deals.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/register"
                  className="group inline-flex items-center px-8 py-4 bg-amber-500 hover:bg-amber-400 text-forest-900 font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-amber-500/25">
                  Get Started
                  <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/prices"
                  className="inline-flex items-center px-8 py-4 bg-white/10 hover:bg-white/20 text-cream font-medium rounded-xl border border-white/20 backdrop-blur-sm transition-all duration-300">
                  <FiTrendingUp className="mr-2" /> Explore Prices
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: FiUsers, value: '10K+', label: 'Farmers' },
              { icon: FiFeather, value: '50K+', label: 'Crop Listings' },
              { icon: FiMapPin, value: '500+', label: 'Markets Covered' },
              { icon: FiTrendingUp, value: '₹2.5Cr+', label: 'Traded Volume' },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-6 text-center hover:shadow-xl transition-shadow">
                <stat.icon className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <p className="text-3xl font-heading font-bold text-forest-700">{stat.value}</p>
                <p className="text-sm text-forest-500 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-forest-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-heading text-forest-700 mb-4">Why AgriLink?</h2>
            <p className="text-forest-500 max-w-xl mx-auto">Built for the modern Indian agriculture ecosystem</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: FiShield, title: 'Trust Score System', desc: 'Every farmer has a verified trust score based on transaction history and quality ratings.' },
              { icon: FiTrendingUp, title: 'Live Market Prices', desc: 'Real-time mandi prices integrated with government APIs for transparent pricing.' },
              { icon: FiFeather, title: 'Smart Recommendations', desc: 'AI-powered crop suggestions based on your region, season, and buying patterns.' },
            ].map((feature, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="group glass rounded-2xl p-8 hover:bg-forest-700 hover:text-cream transition-all duration-500 cursor-default">
                <feature.icon className="w-10 h-10 text-amber-500 group-hover:text-amber-400 mb-5 transition-colors" />
                <h3 className="text-xl font-heading font-bold mb-3 group-hover:text-cream transition-colors">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-forest-500 group-hover:text-forest-200 transition-colors">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-heading text-forest-700 mb-4">How It Works</h2>
            <p className="text-forest-500 max-w-xl mx-auto">Simple steps to start trading</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up as a Farmer or Retail Buyer with your details and location.' },
              { step: '02', title: 'List or Browse', desc: 'Farmers list crops with prices; buyers browse and filter by region.' },
              { step: '03', title: 'Connect & Trade', desc: 'Chat directly, negotiate prices, and close deals seamlessly.' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="relative pl-16">
                <span className="absolute left-0 top-0 text-5xl font-heading font-bold text-forest-200/50">{item.step}</span>
                <h3 className="text-xl font-heading font-bold text-forest-700 mb-2">{item.title}</h3>
                <p className="text-forest-500 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-forest-700 to-forest-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <h2 className="text-4xl md:text-5xl font-heading text-cream mb-6">Ready to Transform Your Agri-Trade?</h2>
            <p className="text-forest-200 text-lg mb-10 max-w-2xl mx-auto">Join thousands of farmers and buyers already using AgriLink</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register?role=FARMER"
                className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-forest-900 font-semibold rounded-xl transition-all">
                Join as Farmer
              </Link>
              <Link to="/register?role=RETAIL_BUYER"
                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-cream font-medium rounded-xl border border-white/20 backdrop-blur-sm transition-all">
                Join as Buyer
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-forest-900 border-t border-forest-700/30">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-forest-400 text-sm">🌾 AgriLink — Connecting Farms to Markets</p>
          <p className="text-forest-600 text-xs mt-2">Made for Indian Agriculture</p>
        </div>
      </footer>
    </div>
  );
}
