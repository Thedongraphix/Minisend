"use client";

import { useState, useRef, useEffect } from "react";

interface Institution {
  code: string;
  name: string;
  type: string;
}

interface BankSelectorProps {
  institutions: Institution[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function BankSelector({
  institutions,
  value,
  onChange,
  disabled = false,
  loading = false,
}: BankSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedBank = institutions.find((inst) => inst.code === value);

  // Filter institutions based on search query
  const filteredInstitutions = institutions.filter((inst) =>
    inst.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Popular Nigerian banks (shown first)
  const popularBanks = [
    "GTBINGLA", // GTBank
    "ZEIBNGLA", // Zenith Bank
    "ABNGNGLA", // Access Bank
    "OPAYNGPC", // OPay
    "FCMBNGLA", // FCMB
    "UBNINGLA", // UBA
    "FIDTNGLA", // Fidelity Bank
  ];

  const popularInstitutions = filteredInstitutions.filter((inst) =>
    popularBanks.includes(inst.code)
  );
  const otherInstitutions = filteredInstitutions.filter(
    (inst) => !popularBanks.includes(inst.code)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
        setFocusedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < filteredInstitutions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && filteredInstitutions[focusedIndex]) {
          onChange(filteredInstitutions[focusedIndex].code);
          setIsOpen(false);
          setSearchQuery("");
          setFocusedIndex(-1);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery("");
        setFocusedIndex(-1);
        break;
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[
        focusedIndex
      ] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [focusedIndex]);

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearchQuery("");
    setFocusedIndex(-1);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled || loading}
        className={`
          w-full px-4 py-3
          bg-[#1c1c1e] border border-[#3a3a3c]
          rounded-xl
          text-left
          transition-all duration-200
          ${
            isOpen
              ? "border-[#0066FF] ring-2 ring-[#0066FF]/20"
              : "hover:border-[#48484a]"
          }
          ${disabled || loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          focus:outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Bank Icon */}
            <div className="w-10 h-10 rounded-lg bg-[#2c2c2e] border border-[#3a3a3c] flex items-center justify-center flex-shrink-0">
              {loading ? (
                <div className="w-4 h-4 border-2 border-[#0066FF] border-t-transparent rounded-full animate-spin" />
              ) : selectedBank ? (
                <svg
                  className="w-5 h-5 text-[#0066FF]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-[#8e8e93]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              )}
            </div>

            {/* Bank Name */}
            <div className="flex-1 min-w-0">
              <div
                className={`text-sm font-medium truncate ${
                  selectedBank ? "text-white" : "text-[#8e8e93]"
                }`}
              >
                {loading
                  ? "Loading banks..."
                  : selectedBank
                    ? selectedBank.name
                    : "Select your bank"}
              </div>
              {selectedBank && (
                <div className="text-xs text-[#8e8e93] mt-0.5">
                  {selectedBank.type === "bank" ? "Bank" : "Mobile Money"}
                </div>
              )}
            </div>
          </div>

          {/* Chevron */}
          <svg
            className={`w-5 h-5 text-[#8e8e93] transition-transform duration-200 flex-shrink-0 ml-2 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[#1c1c1e] border border-[#3a3a3c] rounded-xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-[#3a3a3c]">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-[#8e8e93]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search banks..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#2c2c2e] border border-[#3a3a3c] rounded-lg text-white text-sm placeholder-[#8e8e93] focus:outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 transition-all"
              />
            </div>
          </div>

          {/* Bank List */}
          <div
            ref={listRef}
            className="max-h-[280px] overflow-y-auto overscroll-contain"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#3a3a3c #1c1c1e",
            }}
          >
            {filteredInstitutions.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <svg
                  className="w-12 h-12 text-[#8e8e93] mx-auto mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <p className="text-[#8e8e93] text-sm">No banks found</p>
                <p className="text-[#8e8e93] text-xs mt-1">
                  Try a different search term
                </p>
              </div>
            ) : (
              <>
                {/* Popular Banks Section */}
                {popularInstitutions.length > 0 && searchQuery === "" && (
                  <div>
                    <div className="px-4 py-2 bg-[#2c2c2e] border-b border-[#3a3a3c]">
                      <p className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider">
                        Popular Banks
                      </p>
                    </div>
                    {popularInstitutions.map((institution, index) => (
                      <button
                        key={institution.code}
                        type="button"
                        onClick={() => handleSelect(institution.code)}
                        onMouseEnter={() => setFocusedIndex(index)}
                        className={`
                          w-full px-4 py-3
                          flex items-center gap-3
                          text-left
                          transition-colors duration-150
                          ${
                            focusedIndex === index ||
                            value === institution.code
                              ? "bg-[#0066FF]/10"
                              : "hover:bg-[#2c2c2e]"
                          }
                        `}
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#2c2c2e] border border-[#3a3a3c] flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-4 h-4 text-[#0066FF]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {institution.name}
                          </div>
                        </div>
                        {value === institution.code && (
                          <svg
                            className="w-5 h-5 text-[#0066FF] flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Other Banks Section */}
                {otherInstitutions.length > 0 && (
                  <div>
                    {popularInstitutions.length > 0 && searchQuery === "" && (
                      <div className="px-4 py-2 bg-[#2c2c2e] border-b border-[#3a3a3c]">
                        <p className="text-xs font-semibold text-[#8e8e93] uppercase tracking-wider">
                          All Banks
                        </p>
                      </div>
                    )}
                    {otherInstitutions.map((institution, index) => {
                      const actualIndex =
                        searchQuery === ""
                          ? popularInstitutions.length + index
                          : index;
                      return (
                        <button
                          key={institution.code}
                          type="button"
                          onClick={() => handleSelect(institution.code)}
                          onMouseEnter={() => setFocusedIndex(actualIndex)}
                          className={`
                            w-full px-4 py-3
                            flex items-center gap-3
                            text-left
                            transition-colors duration-150
                            ${
                              focusedIndex === actualIndex ||
                              value === institution.code
                                ? "bg-[#0066FF]/10"
                                : "hover:bg-[#2c2c2e]"
                            }
                          `}
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#2c2c2e] border border-[#3a3a3c] flex items-center justify-center flex-shrink-0">
                            <svg
                              className="w-4 h-4 text-[#8e8e93]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                              />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {institution.name}
                            </div>
                          </div>
                          {value === institution.code && (
                            <svg
                              className="w-5 h-5 text-[#0066FF] flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer with count */}
          {filteredInstitutions.length > 0 && (
            <div className="px-4 py-2 bg-[#2c2c2e] border-t border-[#3a3a3c]">
              <p className="text-xs text-[#8e8e93] text-center">
                {filteredInstitutions.length}{" "}
                {filteredInstitutions.length === 1 ? "bank" : "banks"} available
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
