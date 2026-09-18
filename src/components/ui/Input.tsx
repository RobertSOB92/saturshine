import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-3.5 py-2.5 rounded-xl border text-slate-900 bg-white
            placeholder:text-slate-400 text-sm
            transition-all duration-200
            input-ring
            ${error
              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200'
              : 'border-slate-200 hover:border-slate-300'
            }
            ${className}
          `}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-slate-400">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <span>⚠</span> {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Textarea Variant
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`
            w-full px-3.5 py-2.5 rounded-xl border text-slate-900 bg-white
            placeholder:text-slate-400 text-sm resize-none
            transition-all duration-200
            input-ring
            ${error
              ? 'border-red-400 bg-red-50'
              : 'border-slate-200 hover:border-slate-300'
            }
            ${className}
          `}
          rows={3}
          {...props}
        />
        {hint && !error && (
          <p className="text-xs text-slate-400">{hint}</p>
        )}
        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1">
            <span>⚠</span> {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
