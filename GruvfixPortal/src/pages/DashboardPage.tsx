import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { KPICard } from '../components/common/KPICard';

export const DashboardPage: React.FC = () => {
  const store = useAppStore();
  
  const totalUsers = store.users?.length || 0;
  const totalCustomers = store.customers?.length || 0;
  const totalEntries = store.historicalEntries?.length || 0;
  
  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <span style={{ fontSize: '11px', color: 'var(--primary-color)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
          React Runtime Active
        </span>
        <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 0 0', color: 'var(--text-dark)' }}>
          React Foundation Dashboard
        </h2>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
        gap: '24px' 
      }}>
        <KPICard 
          title="System Operators" 
          value={totalUsers} 
          subtitle="Registered accounts on portal"
          trend={{ value: "Stable", type: "neutral" }}
        />
        <KPICard 
          title="Clients Directory" 
          value={totalCustomers} 
          subtitle="Active corporate customers"
          trend={{ value: "Active", type: "up" }}
        />
        <KPICard 
          title="Total Shifts Logged" 
          value={totalEntries} 
          subtitle="Production entries registered"
          trend={{ value: "Live Sync", type: "up" }}
        />
      </div>
    </div>
  );
};
