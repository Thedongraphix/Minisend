"use client";

import { useState, useEffect } from 'react';
import { getRecipientsByCurrency, deleteRecipient, SavedRecipient } from '@/lib/recipient-storage';

/**
 * Security: Safely display text content
 * React already escapes content by default, but we sanitize to be extra safe
 */
function sanitizeDisplay(text: string | undefined): string {
  if (!text) return '';
  return text.replace(/[<>]/g, '').trim();
}

interface SavedRecipientsProps {
  currency: 'KES' | 'NGN' | 'GHS';
  onSelect: (recipient: SavedRecipient) => void;
  currentPhone?: string;
  currentAccount?: string;
}

export function SavedRecipients({ currency, onSelect, currentPhone, currentAccount }: SavedRecipientsProps) {
  const [recipients, setRecipients] = useState<SavedRecipient[]>([]);
  const [mounted, setMounted] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    loadRecipients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  const loadRecipients = () => {
    const saved = getRecipientsByCurrency(currency);
    setRecipients(saved);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    setTimeout(() => {
      deleteRecipient(id);
      loadRecipients();
      setDeletingId(null);
    }, 150);
  };

  if (!mounted || recipients.length === 0) {
    return null;
  }

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white text-sm font-semibold">Recent</h3>
        <div className="text-xs text-[#8e8e93]">
          {recipients.length} {recipients.length === 1 ? 'recipient' : 'saved'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {recipients.map((recipient) => {
          const isSelected = currency === 'KES'
            ? recipient.phoneNumber === currentPhone
            : recipient.accountNumber === currentAccount;

          return (
            <button
              key={recipient.id}
              onClick={() => onSelect(recipient)}
              className={`
                relative group
                p-3 sm:p-3.5 rounded-xl text-left
                transition-all duration-200
                ${isSelected
                  ? 'bg-[#0066FF]/15 border-2 border-[#0066FF]/60'
                  : 'bg-[#1c1c1e] border border-[#3a3a3c] hover:border-[#48484a] hover:bg-[#2c2c2e]'
                }
                ${deletingId === recipient.id ? 'scale-95 opacity-50' : 'scale-100'}
              `}
            >
              {/* Delete button */}
              <button
                onClick={(e) => handleDelete(e, recipient.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#1c1c1e] border border-[#3a3a3c] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 hover:border-red-500 z-10"
                title="Remove"
              >
                <svg className="w-2.5 h-2.5 text-[#8e8e93] hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Content */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isSelected
                        ? 'bg-[#0066FF] text-white'
                        : 'bg-[#2c2c2e] text-[#8e8e93]'
                    }`}>
                      {recipient.accountName.charAt(0).toUpperCase()}
                    </div>
                    {recipient.useCount > 1 && (
                      <div className="flex items-center space-x-1 text-[10px] text-[#8e8e93]">
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                        <span>{recipient.useCount}</span>
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 bg-[#0066FF] rounded-full flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="text-white font-medium text-sm truncate">
                  {sanitizeDisplay(recipient.accountName)}
                </div>

                <div className="text-[#8e8e93] text-xs font-mono truncate">
                  {currency === 'KES'
                    ? sanitizeDisplay(recipient.phoneNumber)
                    : sanitizeDisplay(recipient.accountNumber)
                  }
                </div>

                {currency === 'NGN' && recipient.bankName && (
                  <div className="text-[#636366] text-[10px] truncate">
                    {sanitizeDisplay(recipient.bankName)}
                  </div>
                )}
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute inset-0 rounded-xl bg-[#0066FF]/5 pointer-events-none"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
