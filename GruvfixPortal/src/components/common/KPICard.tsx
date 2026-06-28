import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    type: 'up' | 'down' | 'neutral';
  };
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, trend }) => {
  return (
    <div className="card stat-card" style={{ padding: '20px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
        {title}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-dark)' }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: '12px', color: 'var(--text-medium)', marginTop: '6px' }}>
          {subtitle}
        </div>
      )}
      {trend && (
        <div style={{ 
          fontSize: '11px', 
          marginTop: '8px', 
          fontWeight: 600,
          color: trend.type === 'up' ? '#137333' : trend.type === 'down' ? '#c5221f' : 'var(--text-medium)' 
        }}>
          {trend.type === 'up' ? '▲' : trend.type === 'down' ? '▼' : '●'} {trend.value}
        </div>
      )}
    </div>
  );
};
