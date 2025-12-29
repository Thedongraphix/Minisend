"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AccountNumberInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  verifying?: boolean;
  onValidationChange?: (isValid: boolean) => void;
}

export function AccountNumberInput({
  label,
  value,
  onChange,
  placeholder = "0123456789",
  disabled = false,
  verifying = false,
  onValidationChange
}: AccountNumberInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // Nigerian bank accounts are typically 10-11 digits
  const minLength = 10;
  const maxLength = 11;

  // Validate account number
  useEffect(() => {
    if (!value) {
      setIsValid(false);
      onValidationChange?.(false);
      return;
    }

    const digits = value.replace(/\D/g, '');
    const valid = digits.length >= minLength && digits.length <= maxLength && /^\d+$/.test(digits);
    setIsValid(valid);
    onValidationChange?.(valid);
  }, [value, onValidationChange]);

  // Handle input change - only allow digits
  const handleChange = (inputValue: string) => {
    // Remove all non-digits
    const digits = inputValue.replace(/\D/g, '');

    // Limit to maxLength
    const limited = digits.slice(0, maxLength);

    onChange(limited);
  };

  const hasValue = value.length > 0;
  const shouldFloatLabel = isFocused || hasValue;
  const showError = hasValue && !isValid && !verifying;
  const showSuccess = hasValue && isValid && !verifying;

  return (
    <div className="w-full">
      <motion.div
        className="relative"
        initial={false}
        animate={{ scale: isFocused ? 1.01 : 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* Left Icon - Account/Card */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#8e8e93] z-10">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>

        {/* Input Field */}
        <motion.input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled || verifying}
          placeholder={shouldFloatLabel ? placeholder : ""}
          maxLength={maxLength}
          className={`
            w-full
            pl-12 pr-12
            pt-6 pb-2
            bg-[#1c1c1e] border
            rounded-xl
            text-white text-base
            placeholder-[#8e8e93]
            transition-all duration-200
            focus:outline-none
            ${
              showSuccess
                ? "border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                : showError
                  ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  : isFocused
                    ? "border-[#0066FF] ring-2 ring-[#0066FF]/20"
                    : "border-[#3a3a3c] hover:border-[#48484a]"
            }
            ${disabled || verifying ? "opacity-50 cursor-not-allowed" : ""}
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
            absolute left-12 pointer-events-none
            transition-colors duration-200
            ${
              showSuccess
                ? "text-green-400"
                : showError
                  ? "text-red-400"
                  : isFocused
                    ? "text-[#0066FF]"
                    : "text-[#8e8e93]"
            }
            ${disabled || verifying ? "opacity-50" : ""}
          `}
        >
          {label}
        </motion.label>

        {/* Right Status Icon with Animation */}
        <div className="absolute right-4 top-[52%] -translate-y-1/2">
          <AnimatePresence mode="wait">
            {verifying && (
              <motion.div
                initial={{ opacity: 0, rotate: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: 0.2 },
                  rotate: { duration: 1, repeat: Infinity, ease: "linear" }
                }}
              >
                <div className="w-5 h-5 border-2 border-[#0066FF] border-t-transparent rounded-full" />
              </motion.div>
            )}
            {!verifying && showSuccess && (
              <motion.div
                initial={{ scale: 0, opacity: 0, rotate: -180 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "backOut" }}
              >
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </motion.div>
            )}
            {!verifying && showError && (
              <motion.div
                initial={{ scale: 0, opacity: 0, rotate: 180 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "backOut" }}
              >
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Helper Text with Animation */}
      <AnimatePresence mode="wait">
        {verifying && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mt-2 px-1"
          >
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-[#0066FF] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[#0066FF]">
                Verifying account with bank...
              </span>
            </div>
          </motion.div>
        )}
        {!verifying && showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mt-2 px-1"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-green-400">
                Valid account number ({value.length} digits)
              </span>
            </div>
          </motion.div>
        )}
        {!verifying && showError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mt-2 px-1"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-red-400">
                Account number must be {minLength}-{maxLength} digits
              </span>
            </div>
          </motion.div>
        )}
        {!verifying && !hasValue && !isFocused && (
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
                Enter your {minLength}-digit account number
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
