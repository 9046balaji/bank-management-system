import React, { forwardRef, useId, memo } from 'react';
import { sanitizeText } from '../utils/sanitize';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  icon?: string;
  iconPosition?: 'left' | 'right';
  sanitize?: boolean;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options: Array<{ value: string; label: string }>;
}

interface FormTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  sanitize?: boolean;
}

/**
 * Accessible form input component with built-in sanitization
 * - Proper label association via htmlFor/id
 * - Error and hint text linked via aria-describedby
 * - Invalid state via aria-invalid
 * - Optional icon support
 */
export const FormInput = memo(forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, hint, icon, iconPosition = 'left', sanitize = false, onChange, className = '', ...props }, ref) => {
    const id = useId();
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    
    const describedBy = [
      error ? errorId : null,
      hint ? hintId : null,
    ].filter(Boolean).join(' ') || undefined;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (sanitize && e.target.value) {
        e.target.value = sanitizeText(e.target.value);
      }
      onChange?.(e);
    };

    return (
      <div className="space-y-2">
        <label 
          htmlFor={id}
          className="block text-sm font-bold text-slate-700 dark:text-slate-300"
        >
          {label}
          {props.required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
        
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <span 
              className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
          
          <input
            ref={ref}
            id={id}
            onChange={handleChange}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
            className={`
              w-full h-12 px-4 rounded-xl 
              bg-slate-50 dark:bg-slate-800 
              border-2 border-transparent
              focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
              transition-all duration-200
              ${icon && iconPosition === 'left' ? 'pl-12' : ''}
              ${icon && iconPosition === 'right' ? 'pr-12' : ''}
              ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
              ${className}
            `}
            {...props}
          />
          
          {icon && iconPosition === 'right' && (
            <span 
              className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              aria-hidden="true"
            >
              {icon}
            </span>
          )}
        </div>
        
        {hint && !error && (
          <p id={hintId} className="text-sm text-slate-500">
            {hint}
          </p>
        )}
        
        {error && (
          <p 
            id={errorId} 
            className="text-sm text-red-500 flex items-center gap-1"
            role="alert"
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">error</span>
            {error}
          </p>
        )}
      </div>
    );
  }
));

FormInput.displayName = 'FormInput';

/**
 * Accessible select component
 */
export const FormSelect = memo(forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, hint, options, className = '', ...props }, ref) => {
    const id = useId();
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    
    const describedBy = [
      error ? errorId : null,
      hint ? hintId : null,
    ].filter(Boolean).join(' ') || undefined;

    return (
      <div className="space-y-2">
        <label 
          htmlFor={id}
          className="block text-sm font-bold text-slate-700 dark:text-slate-300"
        >
          {label}
          {props.required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
        
        <select
          ref={ref}
          id={id}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`
            w-full h-12 px-4 rounded-xl 
            bg-slate-50 dark:bg-slate-800 
            border-2 border-transparent
            focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
            transition-all duration-200
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${className}
          `}
          {...props}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {hint && !error && (
          <p id={hintId} className="text-sm text-slate-500">
            {hint}
          </p>
        )}
        
        {error && (
          <p 
            id={errorId} 
            className="text-sm text-red-500 flex items-center gap-1"
            role="alert"
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">error</span>
            {error}
          </p>
        )}
      </div>
    );
  }
));

FormSelect.displayName = 'FormSelect';

/**
 * Accessible textarea component with sanitization
 */
export const FormTextArea = memo(forwardRef<HTMLTextAreaElement, FormTextAreaProps>(
  ({ label, error, hint, sanitize = false, onChange, className = '', ...props }, ref) => {
    const id = useId();
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    
    const describedBy = [
      error ? errorId : null,
      hint ? hintId : null,
    ].filter(Boolean).join(' ') || undefined;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (sanitize && e.target.value) {
        e.target.value = sanitizeText(e.target.value);
      }
      onChange?.(e);
    };

    return (
      <div className="space-y-2">
        <label 
          htmlFor={id}
          className="block text-sm font-bold text-slate-700 dark:text-slate-300"
        >
          {label}
          {props.required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
        
        <textarea
          ref={ref}
          id={id}
          onChange={handleChange}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`
            w-full p-4 rounded-xl 
            bg-slate-50 dark:bg-slate-800 
            border-2 border-transparent
            focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
            transition-all duration-200 resize-y min-h-[120px]
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${className}
          `}
          {...props}
        />
        
        {hint && !error && (
          <p id={hintId} className="text-sm text-slate-500">
            {hint}
          </p>
        )}
        
        {error && (
          <p 
            id={errorId} 
            className="text-sm text-red-500 flex items-center gap-1"
            role="alert"
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">error</span>
            {error}
          </p>
        )}
      </div>
    );
  }
));

FormTextArea.displayName = 'FormTextArea';

/**
 * PIN input component for secure entry
 */
interface PinInputProps {
  label: string;
  length?: number;
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  masked?: boolean;
}

export const PinInput = memo(function PinInput({ 
  label, 
  length = 4, 
  value, 
  onChange, 
  error,
  masked = true 
}: PinInputProps) {
  const baseId = useId();
  const errorId = `${baseId}-error`;

  const handleChange = (index: number, digit: string) => {
    if (!/^\d?$/.test(digit)) return; // Only allow single digit
    
    const newValue = [...value];
    newValue[index] = digit;
    onChange(newValue);
    
    // Auto-focus next input
    if (digit && index < length - 1) {
      const nextInput = document.getElementById(`${baseId}-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      const prevInput = document.getElementById(`${baseId}-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, length);
    if (/^\d+$/.test(pastedData)) {
      const newValue = pastedData.split('').concat(Array(length - pastedData.length).fill(''));
      onChange(newValue.slice(0, length));
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
        {label}
      </label>
      
      <div 
        className="flex gap-3 justify-center"
        role="group"
        aria-label={label}
      >
        {Array.from({ length }, (_, index) => (
          <input
            key={index}
            id={`${baseId}-${index}`}
            type={masked ? 'password' : 'text'}
            inputMode="numeric"
            maxLength={1}
            value={value[index] || ''}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`
              w-14 h-14 text-center text-2xl font-bold
              bg-slate-50 dark:bg-slate-800 
              border-2 rounded-xl
              focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none
              transition-all duration-200
              ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'}
            `}
            autoComplete="off"
          />
        ))}
      </div>
      
      {error && (
        <p 
          id={errorId} 
          className="text-sm text-red-500 text-center flex items-center justify-center gap-1"
          role="alert"
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">error</span>
          {error}
        </p>
      )}
    </div>
  );
});

export default FormInput;
