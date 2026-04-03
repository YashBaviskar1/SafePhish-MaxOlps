import React from 'react';

const Footer = () => {
  return (
    <footer className="absolute bottom-0 right-0 border-t border-[#76767f]/20 bg-[#060819] flex justify-between items-center px-6 py-3 w-full z-40">
      <div className="flex items-center gap-4">
        <span className="text-[#76767f] text-xs uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>© 2024 SafePhish Sentinel System</span>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-emerald-500 text-xs uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          System Status: Operational
        </div>
        <span className="text-[#76767f] text-xs uppercase tracking-widest" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>v1.0.0-MVP</span>
      </div>
    </footer>
  );
};

export default Footer;