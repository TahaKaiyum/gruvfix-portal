import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <main style={{ flexGrow: 1, padding: '40px', backgroundColor: 'var(--bg-light)' }}>
        {children}
      </main>
    </div>
  );
};
