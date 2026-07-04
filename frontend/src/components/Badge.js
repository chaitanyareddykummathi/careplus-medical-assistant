import React from 'react';

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  width: 'fit-content',
};

const variants = {
  primary: {
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
  },
  secondary: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
  },
  success: {
    backgroundColor: '#ECFDF5',
    color: '#10B981',
  },
  warning: {
    backgroundColor: '#FFFBEB',
    color: '#F59E0B',
  },
  danger: {
    backgroundColor: '#FEF2F2',
    color: '#EF4444',
  },
  teal: {
    backgroundColor: '#F0FDFA',
    color: '#14B8A6',
  },
};

function Badge({ children, variant = 'primary', className = '', style = {} }) {
  const chosenVariant = variants[variant] || variants.primary;
  return (
    <span
      className={`cp-badge ${className}`}
      style={{
        ...badgeStyle,
        ...chosenVariant,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export default Badge;
