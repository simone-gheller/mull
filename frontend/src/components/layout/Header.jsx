import React from 'react';
import { motion } from 'framer-motion';
import { Shield, LogOut, Settings, User, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

const Header = ({ onMenuToggle, showMenuButton = false }) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border-b border-neutral-200 px-6 py-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showMenuButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuToggle}
              className="lg:hidden"
            >
              <Menu size={20} />
            </Button>
          )}
          
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-xl font-bold text-neutral-900">SafeConfig</h1>
              <p className="text-xs text-neutral-500">Secure Parameter Management</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2 text-sm text-neutral-600">
            <User size={16} />
            <span>Welcome, {user?.displayName || user?.email || 'User'}</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:flex"
            leftIcon={<Settings size={16} />}
          >
            Settings
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            leftIcon={<LogOut size={16} />}
          >
            <span className="hidden sm:inline">Logout</span>
            <span className="sm:hidden">
              <LogOut size={16} />
            </span>
          </Button>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;