import React from 'react';

const Sidebar = ({ currentPage, setCurrentPage }) => {
  const navItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { id: 'url_report', icon: 'psychology', label: 'URL Report' },
    { id: 'email_report', icon: 'mail', label: 'Email Report' },
    { id: 'pipeline_overview', icon: 'account_tree', label: 'Pipeline Overview' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full flex flex-col bg-[#060819] w-64 border-r border-[#76767f]/20 shadow-2xl z-50">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#aab3d8] p-1.5 rounded-md">
            <span className="material-symbols-outlined text-[#060819]" style={{ fontVariationSettings: "'FILL' 1" }}>
              security
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tighter" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>SafePhish</h1>
            <p className="text-[10px] text-[#76767f] uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Cybersecurity Analytics</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 mt-4 px-3 space-y-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button 
              key={item.id} 
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 active:scale-95 text-left
                ${isActive 
                  ? 'text-white bg-[#76767f]/10 border-l-4 border-[#aab3d8] font-bold' 
                  : 'text-[#76767f] hover:text-[#aab3d8] hover:bg-[#76767f]/10'}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      
    </aside>
  );
};

export default Sidebar;