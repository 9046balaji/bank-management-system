import React, { memo, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-primary text-white 
    hover:bg-primary-hover 
    shadow-lg shadow-primary/20 
    focus:ring-primary/50
  `,
  secondary: `
    bg-slate-100 dark:bg-slate-800 
    text-slate-700 dark:text-slate-300 
    hover:bg-slate-200 dark:hover:bg-slate-700
    focus:ring-slate-500/50
  `,
  danger: `
    bg-red-500 text-white 
    hover:bg-red-600 
    shadow-lg shadow-red-500/20
    focus:ring-red-500/50
  `,
  ghost: `
    bg-transparent 
    text-slate-600 dark:text-slate-400 
    hover:bg-slate-100 dark:hover:bg-slate-800
    focus:ring-slate-500/50
  `,
  outline: `
    bg-transparent 
    border-2 border-primary text-primary 
    hover:bg-primary/10
    focus:ring-primary/50
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2',
  xl: 'h-14 px-8 text-lg rounded-2xl gap-3',
};

const iconSizes: Record<ButtonSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

/**
 * Accessible button component with various styles and states
 * - Proper focus management with visible ring
 * - Loading state with spinner
 * - Icon support
 * - Disabled state handling
 */
export const Button = memo(forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'left',
      loading = false,
      loadingText = 'Loading...',
      fullWidth = false,
      disabled,
      children,
      className = '',
      ...props
    },
    ref
  ) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        className={`
          inline-flex items-center justify-center font-bold
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2
          active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <>
            <span 
              className={`material-symbols-outlined animate-spin ${iconSizes[size]}`}
              aria-hidden="true"
            >
              progress_activity
            </span>
            <span>{loadingText}</span>
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <span 
                className={`material-symbols-outlined ${iconSizes[size]}`}
                aria-hidden="true"
              >
                {icon}
              </span>
            )}
            {children}
            {icon && iconPosition === 'right' && (
              <span 
                className={`material-symbols-outlined ${iconSizes[size]}`}
                aria-hidden="true"
              >
                {icon}
              </span>
            )}
          </>
        )}
      </button>
    );
  }
));

/**
 * Icon-only button with proper accessibility
 */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label: string; // Required for accessibility
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const IconButton = memo(forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      icon,
      label,
      variant = 'ghost',
      size = 'md',
      loading = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) {
    const isDisabled = disabled || loading;
    
    const sizeMap: Record<ButtonSize, string> = {
      sm: 'size-8',
      md: 'size-10',
      lg: 'size-12',
      xl: 'size-14',
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        aria-label={label}
        title={label}
        className={`
          inline-flex items-center justify-center rounded-full
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2
          active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
          ${variantStyles[variant]}
          ${sizeMap[size]}
          ${className}
        `}
        {...props}
      >
        <span 
          className={`material-symbols-outlined ${iconSizes[size]} ${loading ? 'animate-spin' : ''}`}
          aria-hidden="true"
        >
          {loading ? 'progress_activity' : icon}
        </span>
      </button>
    );
  }
));

/**
 * Button group for related actions
 */
interface ButtonGroupProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const ButtonGroup = memo(function ButtonGroup({
  children,
  orientation = 'horizontal',
  className = '',
}: ButtonGroupProps) {
  return (
    <div 
      role="group"
      className={`
        flex gap-2
        ${orientation === 'vertical' ? 'flex-col' : 'flex-row'}
        ${className}
      `}
    >
      {children}
    </div>
  );
});

export default Button;
