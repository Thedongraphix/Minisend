"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PhoneNumberInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  currency: 'KES' | 'GHS';
  placeholder?: string;
  disabled?: boolean;
  onValidationChange?: (isValid: boolean) => void;
}

// Phone number validation patterns
const PHONE_PATTERNS = {
  KES: {
    countryCode: '+254',
    flag: '🇰🇪',
    name: 'Kenya',
    regex: /^(\+?254|0)?[17]\d{8}$/,
    format: (value: string) => {
      const digits = value.replace(/\D/g, '');
      if (digits.startsWith('254')) return '+' + digits;
      if (digits.startsWith('0')) return '+254' + digits.substring(1);
      if (digits.length === 9) return '+254' + digits;
      return value;
    },
    placeholder: '712345678'
  },
  GHS: {
    countryCode: '+233',
    flag: '🇬🇭',
    name: 'Ghana',
    regex: /^(\+?233|0)?[2352]\d{8}$/,
    format: (value: string) => {
      const digits = value.replace(/\D/g, '');
      if (digits.startsWith('233')) return '+' + digits;
      if (digits.startsWith('0')) return '+233' + digits.substring(1);
      if (digits.length === 9) return '+233' + digits;
      return value;
    },
    placeholder: '241234567'
  }
};

const AVAILABLE_COUNTRIES = [
  { code: 'KES' as const, ...PHONE_PATTERNS.KES },
  { code: 'GHS' as const, ...PHONE_PATTERNS.GHS }
];

export function PhoneNumberInput({
  label,
  value,
  onChange,
  currency,
  placeholder,
  disabled = false,
  onValidationChange
}: PhoneNumberInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(currency);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pattern = PHONE_PATTERNS[selectedCountry];
  const countryCode = pattern.countryCode;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Validate phone number
  useEffect(() => {
    if (!value) {
      setIsValid(false);
      onValidationChange?.(false);
      return;
    }

    const cleanValue = value.replace(/\D/g, '');
    const valid = pattern.regex.test(cleanValue);
    setIsValid(valid);
    onValidationChange?.(valid);
  }, [value, pattern, onValidationChange]);

  // Handle country change
  const handleCountryChange = (newCountry: 'KES' | 'GHS') => {
    setSelectedCountry(newCountry);
    setShowDropdown(false);

    // Clear the input when changing countries
    setDisplayValue('');
    onChange('');
  };

  // Handle input change with smart formatting
  const handleChange = (inputValue: string) => {
    // Only allow digits
    const digits = inputValue.replace(/\D/g, '');

    // Format based on country
    let formatted = digits;
    if (digits.startsWith('0')) {
      // Remove leading 0
      formatted = digits.substring(1);
    }

    setDisplayValue(formatted);

    // Add country code when saving
    const fullNumber = formatted ? countryCode + formatted : '';
    onChange(fullNumber);
  };

  // Initialize focus
  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const hasValue = value.length > 0 && value !== countryCode;
  const shouldFloatLabel = isFocused || hasValue;

  return (
    <div className="w-full">
      <motion.div
        className="relative"
        initial={false}
        animate={{ scale: isFocused ? 1.01 : 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* Country Selector Dropdown Button */}
        <div ref={dropdownRef} className="absolute left-3 top-1/2 -translate-y-1/2 z-20">
          <button
            type="button"
            onClick={() => !disabled && setShowDropdown(!showDropdown)}
            disabled={disabled}
            className={`
              flex items-center gap-1.5 px-2 py-1.5
              bg-[#2c2c2e] border border-[#3a3a3c]
              rounded-lg
              transition-all duration-200
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#3a3a3c] hover:border-[#48484a] cursor-pointer'}
            `}
          >
            <span className="text-lg leading-none">{pattern.flag}</span>
            <span className="text-[#8e8e93] text-xs font-medium">{pattern.countryCode}</span>
            <motion.svg
              className="w-3 h-3 text-[#8e8e93]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              animate={{ rotate: showDropdown ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </motion.svg>
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute top-full left-0 mt-2 w-48 bg-[#1c1c1e] border border-[#3a3a3c] rounded-xl shadow-2xl overflow-hidden"
              >
                {AVAILABLE_COUNTRIES.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountryChange(country.code)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3
                      transition-all duration-150
                      ${selectedCountry === country.code
                        ? 'bg-[#0066FF]/10 text-white'
                        : 'text-[#8e8e93] hover:bg-[#2c2c2e]'
                      }
                    `}
                  >
                    <span className="text-xl">{country.flag}</span>
                    <div className="flex-1 text-left">
                      <div className={`text-sm font-medium ${selectedCountry === country.code ? 'text-white' : 'text-[#8e8e93]'}`}>
                        {country.name}
                      </div>
                      <div className="text-xs text-[#8e8e93]">{country.countryCode}</div>
                    </div>
                    {selectedCountry === country.code && (
                      <svg className="w-4 h-4 text-[#0066FF]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Field */}
        <motion.input
          type="tel"
          inputMode="tel"
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={shouldFloatLabel ? (placeholder || pattern.placeholder) : ""}
          className={`
            w-full
            pl-28 pr-12
            pt-6 pb-2
            bg-[#1c1c1e] border
            rounded-xl
            text-white text-base
            placeholder-[#8e8e93]
            transition-all duration-200
            focus:outline-none
            ${
              isValid && hasValue
                ? "border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                : !isValid && hasValue
                  ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  : isFocused
                    ? "border-[#0066FF] ring-2 ring-[#0066FF]/20"
                    : "border-[#3a3a3c] hover:border-[#48484a]"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
        />

        {/* Floating Label with Animation */}
        <motion.label
          initial={false}
          animate={{
            top: shouldFloatLabel ? "0.5rem" : "50%",
            fontSize: shouldFloatLabel ? "0.75rem" : "1rem",
            y: shouldFloatLabel ? 0 : "-50%",
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`
            absolute left-28 pointer-events-none
            transition-colors duration-200
            ${
              isValid && hasValue
                ? "text-green-400"
                : !isValid && hasValue
                  ? "text-red-400"
                  : isFocused
                    ? "text-[#0066FF]"
                    : "text-[#8e8e93]"
            }
            ${disabled ? "opacity-50" : ""}
          `}
        >
          {label}
        </motion.label>

        {/* Right Status Icon with Animation */}
        <AnimatePresence mode="wait">
          {hasValue && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "backOut" }}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              {isValid ? (
                <motion.div
                  initial={{ rotate: -180 }}
                  animate={{ rotate: 0 }}
                  transition={{ duration: 0.3, ease: "backOut" }}
                  className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                >
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ rotate: 180 }}
                  animate={{ rotate: 0 }}
                  transition={{ duration: 0.3, ease: "backOut" }}
                  className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                >
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Helper Text with Animation */}
      <AnimatePresence>
        {hasValue && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mt-2 px-1"
          >
            {isValid ? (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs text-green-400">
                  Valid {pattern.name} number
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-xs text-red-400">
                  Invalid phone number format
                </span>
              </div>
            )}
          </motion.div>
        )}
        {!hasValue && !isFocused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2 px-1"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#8e8e93] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-[#8e8e93]">
                Select country and enter mobile number
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
