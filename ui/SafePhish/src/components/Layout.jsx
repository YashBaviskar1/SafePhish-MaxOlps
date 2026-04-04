import React from 'react';
import Sidebar from './Sidebar'
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = ({ children, currentPage, setCurrentPage }) => {
  return (
    <div className="text-[#aab3d8] font-sans min-h-screen selection:bg-[#aab3d8] selection:text-[#060819] flex">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      <main className="ml-72 flex-1 pb-20 relative min-h-screen flex flex-col" style={{ zoom: 0.88 }}>
        <Navbar currentPage={currentPage} />
        
        {/* Dynamic Page Content goes here */}
        <div className="flex-1">
          {children}
        </div>
        
        <Footer />
      </main>
    </div>
  );
};

export default Layout;