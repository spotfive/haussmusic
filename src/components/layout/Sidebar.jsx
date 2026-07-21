import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Home, Search, Library, Music2, Trophy, Plus, Users, Code, Settings, Shield, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const navItems = [
  { icon: Home, label: 'Início', page: 'Home' },
  { icon: Search, label: 'Buscar', page: 'Search' },
  { icon: Library, label: 'Biblioteca', page: 'Library' },
];

const libraryItems = [
  { icon: Trophy, label: 'Rankings', page: 'Rankings' },
];

export default function Sidebar({ currentPage }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    const interval = setInterval(() => {
      base44.auth.me().then(setUser).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
    staleTime: 60000,
  });

  const logoUrl = appSettings.find(s => s.key === 'logo_url')?.value || null;

  const isActive = (page) => currentPage === page;

  return (
    <aside className="hidden lg:flex flex-col w-[72px] bg-[#000000] border-r border-[#282828] h-screen shrink-0">
      {/* Logo */}
      <div className="flex items-center justify-center h-[72px] border-b border-[#282828]">
        <Link to={createPageUrl('Home')}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#8B5CF6] flex items-center justify-center">
              <span className="text-white font-black text-xs">ATX</span>
            </div>
          )}
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col items-center gap-1 pt-4 px-2">
        {navItems.map((item) => (
          <Link key={item.page} to={createPageUrl(item.page)} className="w-full">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-200 ${
                isActive(item.page)
                  ? 'text-[#8B5CF6]'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <item.icon className={`w-6 h-6 ${isActive(item.page) ? 'fill-current/10' : ''}`} />
              <span className="text-[9px] font-medium leading-none">{item.label}</span>
            </motion.div>
          </Link>
        ))}

        {/* Divider */}
        <div className="w-8 h-px bg-[#282828] my-2" />

        {/* Library section */}
        {libraryItems.map((item) => (
          <Link key={item.page} to={createPageUrl(item.page)} className="w-full">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-200 ${
                isActive(item.page)
                  ? 'text-[#8B5CF6]'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[9px] font-medium leading-none">{item.label}</span>
            </motion.div>
          </Link>
        ))}

        {/* Artist Dashboard link */}
        {(user?.user_type === 'artista' || user?.user_type === 'staff' || user?.role === 'admin') && (
          <Link to={createPageUrl('ArtistDashboard')} className="w-full">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-200 ${
                isActive('ArtistDashboard')
                  ? 'text-[#8B5CF6]'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <Award className="w-6 h-6" />
              <span className="text-[9px] font-medium leading-none">Artista</span>
            </motion.div>
          </Link>
        )}

        {/* Label Dashboard link */}
        {user?.user_type === 'gravadora' && (
          <Link to={createPageUrl('LabelDashboard')} className="w-full">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-200 ${
                isActive('LabelDashboard')
                  ? 'text-[#8B5CF6]'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <Music2 className="w-6 h-6" />
              <span className="text-[9px] font-medium leading-none">Gravadora</span>
            </motion.div>
          </Link>
        )}

        {/* Label Management link (for staff) */}
        {user?.user_type === 'staff' && (
          <Link to={createPageUrl('LabelManagement')} className="w-full">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-200 ${
                isActive('LabelManagement')
                  ? 'text-[#8B5CF6]'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <Music2 className="w-6 h-6" />
              <span className="text-[9px] font-medium leading-none">Gravadoras</span>
            </motion.div>
          </Link>
        )}

        {/* Admin link */}
        {user?.role === 'admin' && (
          <Link to={createPageUrl('AdminDashboard')} className="w-full mt-auto">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-200 ${
                isActive('AdminDashboard')
                  ? 'text-[#8B5CF6]'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <Shield className="w-6 h-6" />
              <span className="text-[9px] font-medium leading-none">Admin</span>
            </motion.div>
          </Link>
        )}
      </nav>

      {/* Bottom spacer */}
      <div className="h-24" />
    </aside>
  );
}