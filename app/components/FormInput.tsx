"use client";

import { useState } from "react";

interface FormInputProps {
  label: string;
  type?: "text" | "tel" | "email" | "number";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  success?: boolean;
  helperText?: string;
  icon?: React.ReactNode;
  statusIcon?: React.ReactNode;
  inputMode?: "text" | "decimal" | "numeric" | "tel" | "email";
  maxLength?: number;
}

export function FormInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled = false,
  error,
  success = false,
  helperText,
  icon,
  statusIcon,
  inputMode,
  maxLength,
}: FormInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const hasValue = value.length > 0;
  const shouldFloatLabel = isFocused || hasValue;

  return (
    <div className="w-full">
      <div className="relative">
        {/* Left Icon */}
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#8e8e93] z-10">
            {icon}
          </div>
        )}

        {/* Input Field */}
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={shouldFloatLabel ? placeholder : ""}
          maxLength={maxLength}
          className={`
            w-full
            ${icon ? "pl-12" : "pl-4"}
            ${statusIcon ? "pr-12" : "pr-4"}
            pt-6 pb-2
            bg-[#1c1c1e] border
            rounded-xl
            text-white text-base
            placeholder-[#8e8e93]
            transition-all duration-200
            focus:outline-none
            ${
              error
                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                : success
                  ? "border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  : isFocused
                    ? "border-[#0066FF] ring-2 ring-[#0066FF]/20"
                    : "border-[#3a3a3c] hover:border-[#48484a]"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
        />

        {/* Floating Label */}
        <label
          className={`
            absolute
            ${icon ? "left-12" : "left-4"}
            pointer-events-none
            transition-all duration-200
            ${
              shouldFloatLabel
                ? "top-2 text-xs"
                : "top-1/2 -translate-y-1/2 text-base"
            }
            ${
              error
                ? "text-red-400"
                : success
                  ? "text-green-400"
                  : isFocused
                    ? "text-[#0066FF]"
                    : "text-[#8e8e93]"
            }
            ${disabled ? "opacity-50" : ""}
          `}
        >
          {label}
        </label>

        {/* Right Status Icon */}
        {statusIcon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {statusIcon}
          </div>
        )}
      </div>

      {/* Helper Text or Error */}
      {(helperText || error) && (
        <div className="mt-2 px-1">
          {error ? (
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-red-400 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs text-red-400">{error}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-[#8e8e93] flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs text-[#8e8e93]">{helperText}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
