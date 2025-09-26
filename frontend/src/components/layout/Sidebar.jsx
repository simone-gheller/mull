import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Settings, 
  FolderOpen, 
  Users, 
  Database,
  History,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

const Sidebar = ({ isOpen, onClose, showOverlay = false }) => {
  const { user } = useAuth();
  
  const navItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'Projects',
      href: '/projects',
      icon: FolderOpen,
    },
    {
      name: 'Parameters',
      href: '/parameters',
      icon: Database,
    },
    {
      name: 'History',
      href: '/history',
      icon: History,
    },
    // Admin-only navigation items (you can add role checking logic here)
    ...(user?.role === 'ADMIN' || user?.role === 'OWNER' ? [
      {
        name: 'Users',
        href: '/users',
        icon: Users,
      },
      {
        name: 'Settings',
        href: '/settings',
        icon: Settings,
      },
    ] : []),
  ];

  const sidebarContent = (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      exit={{ x: -300 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="h-full bg-white border-r border-neutral-200 w-64 flex flex-col"
    >
      <div className="p-4 border-b border-neutral-200 flex justify-between items-center lg:hidden">
        <h2 className="font-semibold text-neutral-900">Menu</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => showOverlay && onClose()}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`
              }
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-neutral-200">
        <div className="text-xs text-neutral-500">
          <p>SafeConfig v1.0</p>
          <p>© 2025 Secure Config</p>
        </div>
      </div>
    </motion.div>
  );

  if (showOverlay) {
    return (
      <>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
        <motion.div
          className={`fixed top-0 left-0 z-50 h-full lg:hidden ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </motion.div>
      </>
    );
  }

  return (
    <div className="hidden lg:block h-screen sticky top-0">
      {sidebarContent}
    </div>
  );
};

export default Sidebar;