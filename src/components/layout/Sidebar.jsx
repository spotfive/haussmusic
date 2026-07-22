import React from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Home, Search, Library, Music2, Star, Shield, Award, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { hasUserType } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Início', page: 'Home' },
  { icon: Search, label: 'Buscar', page: 'Search' },
  { icon: Library, label: 'Biblioteca', page: 'Library' },
];

const libraryItems = [
  { icon: Star, label: 'HAUSS HITS', page: 'Rankings' },
];

export default function Sidebar({ currentPage }) {
  const { user, isAuthenticated } = useAuth();

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
    staleTime: 60000,
  });

  const logoUrl = appSettings.find(s => s.key === 'logo_url')?.value || '/logo.png';

  const isActive = (page) => currentPage === page;

  return (
    <aside className="hidden lg:flex flex-col w-[72px] bg-[#000000] border-r border-[#282828] h-screen shrink-0">
      {/* Logo */}
      <div className="flex items-center justify-center h-[72px] border-b border-[#282828]">
        <Link to={createPageUrl('Home')}>
          {logoUrl ? (
            <img src={logoUrl} alt="HAUSS MUSIC" className="w-10 h-10 object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#c0c0c8] flex items-center justify-center">
              <span className="text-black font-black text-xs">HM</span>
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
                  ? 'text-[#c0c0c8]'
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
                  ? 'text-[#c0c0c8]'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <item.icon
                className={`w-6 h-6 ${isActive(item.page) ? 'fill-current' : ''}`}
                style={isActive(item.page) ? { filter: 'drop-shadow(0 0 6px rgba(192,192,200,0.7))' } : undefined}
              />
              <span className="text-[9px] font-medium leading-none">{item.label}</span>
            </motion.div>
          </Link>
        ))}

        {/* Artist Dashboard link */}
        {(hasUserType(user, 'artista') || hasUserType(user, 'staff') || user?.role === 'admin') && (
          <Link to={createPageUrl('ArtistDashboard')} className="w-full">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-200 ${
                isActive('ArtistDashboard')
                  ? 'text-[#c0c0c8]'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <Award className="w-6 h-6" />
              <span className="text-[9px] font-medium leading-none">Artista</span>
            </motion.div>
          </Link>
        )}

        {/* Label Dashboard link */}
        {(hasUserType(user, 'gravadora') || user?.role === 'admin') && (
          <Link to={createPageUrl('LabelDashboard')} className="w-full">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-200 ${
                isActive('LabelDashboard')
                  ? 'text-[#c0c0c8]'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <Music2 className="w-6 h-6" />
              <span className="text-[9px] font-medium leading-none">Gravadora</span>
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
                  ? 'text-[#c0c0c8]'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <Shield className="w-6 h-6" />
              <span className="text-[9px] font-medium leading-none">Admin</span>
            </motion.div>
          </Link>
        )}

        {/* Login link (anonymous visitors) */}
        {!isAuthenticated && (
          <Link to="/AuthPage" className="w-full mt-auto">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex flex-col items-center justify-center gap-1 py-3 rounded-xl transition-all duration-200 text-[#c0c0c8] hover:text-white"
            >
              <LogIn className="w-6 h-6" />
              <span className="text-[9px] font-medium leading-none">Entrar</span>
            </motion.div>
          </Link>
        )}
      </nav>

      {/* Bottom spacer */}
      <div className="h-24" />
    </aside>
  );
}