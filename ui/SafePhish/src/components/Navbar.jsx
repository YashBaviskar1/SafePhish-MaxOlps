import React from 'react';

const Navbar = ({ currentPage }) => {
  return (
    <header className="sticky top-0 z-40 bg-transparent backdrop-blur-md flex justify-between items-center px-8 py-8 w-full transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className="text-[#76767f] flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">terminal</span>
          <span className="text-xs font-mono uppercase tracking-[0.2em] opacity-60">
             analysis_engine / {currentPage.replace('_', ' ')}
          </span>
        </div>
      </div>
      
    </header>
  );
};

export default Navbar;