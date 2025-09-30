import React from 'react';

const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  className = '',
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full transition-all duration-200';
  
  const variants = {
    default: 'bg-white/20 text-white border border-white/30',
    primary: 'bg-blue-500/20 text-blue-200 border border-blue-400/30',
    success: 'bg-green-500/20 text-green-200 border border-green-400/30',
    warning: 'bg-yellow-500/20 text-yellow-200 border border-yellow-400/30',
    danger: 'bg-red-500/20 text-red-200 border border-red-400/30',
    info: 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30',
    gradient: 'bg-gradient-to-r from-purple-400/20 to-pink-400/20 text-white border border-purple-400/30'
  };
  
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };
  
  const badgeClasses = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;
  
  return (
    <span className={badgeClasses} {...props}>
      {children}
    </span>
  );
};

export default Badge;