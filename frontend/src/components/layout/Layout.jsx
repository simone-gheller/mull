import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="flex">
        {/* Desktop Sidebar */}
        <Sidebar isOpen={true} onClose={closeSidebar} />
        
        {/* Mobile Sidebar with Overlay */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={closeSidebar} 
          showOverlay={true} 
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header 
            onMenuToggle={toggleSidebar} 
            showMenuButton={true}
          />
          
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;