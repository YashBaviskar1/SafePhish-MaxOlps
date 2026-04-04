import React from 'react';

const Navbar = ({ currentPage }) => {
  return (
    <header className="sticky top-0 z-40 bg-[#060819]/90 backdrop-blur-md flex justify-between items-center px-6 py-3 w-full border-b border-[#76767f]/20 transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className="text-[#76767f] flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">terminal</span>
          <span className="text-xs font-mono uppercase tracking-widest">
             analysis_engine / {currentPage.replace('_', ' ')}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="relative group">
          <span className="absolute inset-y-0 left-3 flex items-center text-[#76767f]">
            <span className="material-symbols-outlined text-sm">search</span>
          </span>
          <input 
            type="text"
            placeholder="Search incidents..." 
            className="bg-[#76767f]/10 border border-[#76767f]/30 rounded-lg text-xs pl-10 pr-4 py-2 w-64 focus:outline-none focus:border-[#aab3d8] text-[#aab3d8] transition-all"
          />
        </div>
      </div>
    </header>
  );
};

export default Navbar;