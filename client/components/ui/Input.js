import React, { forwardRef } from 'react';

const Input = forwardRef(({ 
  label,
  error,
  icon,
  className = '',
  type = 'text',
  ...props 
}, ref) => {
  const inputClasses = `input-modern w-full ${error ? 'border-red-400 focus:border-red-400' : ''} ${className}`;
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-white/90">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-white/60">{icon}</span>
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={`${inputClasses} ${icon ? 'pl-10' : ''}`}
          {...props}
        />
      </div>
      {error && (
        <p className="text-red-400 text-sm animate-slide-up">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;