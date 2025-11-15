"use client";

import { useState, useEffect, useRef } from 'react';
import { SavedRecipient } from '@/lib/recipient-storage';

interface RecipientAutocompleteProps {
  recipients: SavedRecipient[];
  searchValue: string;
  onSelect: (recipient: SavedRecipient) => void;
  searchField: 'phone' | 'account';
  isVisible: boolean;
  onClose: () => void;
}

export function RecipientAutocomplete({
  recipients,
  searchValue,
  onSelect,
  searchField,
  isVisible,
  onClose
}: RecipientAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter recipients based on search value
  const filteredRecipients = recipients.filter(recipient => {
    if (!searchValue || searchValue.length < 2) return false;

    const searchLower = searchValue.toLowerCase();

    if (searchField === 'phone') {
      return recipient.phoneNumber?.toLowerCase().includes(searchLower) ||
             recipient.accountName.toLowerCase().includes(searchLower);
    } else {
      return recipient.accountNumber?.toLowerCase().includes(searchLower) ||
             recipient.accountName.toLowerCase().includes(searchLower);
    }
  });

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchValue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isVisible || filteredRecipients.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < filteredRecipients.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredRecipients[selectedIndex]) {
            onSelect(filteredRecipients[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    }

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, selectedIndex, filteredRecipients, onSelect, onClose]);

  if (!isVisible || filteredRecipients.length === 0) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-[#1c1c1e] border border-[#3a3a3c] rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
      style={{
        boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.5)'
      }}
    >
      <div className="px-3 py-2 border-b border-[#3a3a3c]/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#8e8e93] font-medium">Suggested recipients</span>
          <span className="text-[10px] text-[#636366]">↑↓ navigate • ⏎ select</span>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {filteredRecipients.map((recipient, index) => (
          <button
            key={recipient.id}
            onClick={() => onSelect(recipient)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={`
              w-full px-4 py-3 text-left transition-all duration-150
              flex items-center space-x-3 border-b border-[#2c2c2e]/50 last:border-0
              ${index === selectedIndex
                ? 'bg-[#0066FF]/20 border-l-2 border-l-[#0066FF]'
                : 'hover:bg-[#2c2c2e]/50 border-l-2 border-l-transparent'
              }
            `}
          >
            {/* Avatar */}
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold
              ${index === selectedIndex
                ? 'bg-[#0066FF] text-white'
                : 'bg-[#2c2c2e] text-[#8e8e93]'
              }
            `}>
              {recipient.accountName.charAt(0).toUpperCase()}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <div className="text-white font-medium text-sm truncate">
                  {recipient.accountName}
                </div>
                {recipient.useCount > 1 && (
                  <div className="flex items-center space-x-1 text-[10px] text-[#8e8e93] bg-[#2c2c2e] px-1.5 py-0.5 rounded">
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    <span>{recipient.useCount}x</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 mt-1">
                <div className="text-[#8e8e93] text-xs font-mono">
                  {searchField === 'phone'
                    ? recipient.phoneNumber
                    : recipient.accountNumber
                  }
                </div>
                {searchField === 'account' && recipient.bankName && (
                  <div className="text-[#636366] text-[10px] truncate">
                    • {recipient.bankName}
                  </div>
                )}
              </div>
            </div>

            {/* Selection indicator */}
            {index === selectedIndex && (
              <div className="flex-shrink-0">
                <svg className="w-4 h-4 text-[#0066FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
