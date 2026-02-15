"use client";

import { useState, useEffect } from 'react';
import { getRecipientsByCurrency, deleteRecipient, SavedRecipient } from '@/lib/recipient-storage';

/**
 * Security: Safely display text content
 */
function sanitizeDisplay(text: string | undefined): string {
  if (!text) return '';
  return text.replace(/[<>]/g, '').trim();
}

interface SavedRecipientsProps {
  currency: 'KES' | 'NGN' | 'GHS' | 'UGX';
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

  const isMobileType = currency === 'KES' || currency === 'GHS' || currency === 'UGX';

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <span className="text-[#636366] text-[12px] font-medium">Recent</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {recipients.map((recipient) => {
          const isSelected = isMobileType
            ? recipient.phoneNumber === currentPhone
            : recipient.accountNumber === currentAccount;
          const isDeleting = deletingId === recipient.id;

          return (
            <button
              key={recipient.id}
              onClick={() => onSelect(recipient)}
              className={`
                relative flex-shrink-0 flex items-center gap-2 pl-2.5 pr-2 py-2
                rounded-full border transition-all duration-150
                ${isDeleting ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}
                ${isSelected
                  ? 'bg-white/[0.06] border-white/[0.12]'
                  : 'bg-white/[0.03] border-white/[0.06] active:bg-white/[0.06]'
                }
              `}
            >
              {/* Initial */}
              <div className="w-6 h-6 rounded-full bg-[#2c2c2e] flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-semibold text-[#8e8e93]">
                  {recipient.accountName.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Name + number */}
              <div className="flex flex-col items-start leading-tight">
                <span className="text-white text-[12px] font-medium whitespace-nowrap">
                  {sanitizeDisplay(recipient.accountName)}
                </span>
                <span className="text-[#636366] text-[10px] whitespace-nowrap">
                  {isMobileType
                    ? sanitizeDisplay(recipient.phoneNumber)
                    : sanitizeDisplay(recipient.accountNumber)
                  }
                  {currency === 'NGN' && recipient.bankName && (
                    <> · {sanitizeDisplay(recipient.bankName)}</>
                  )}
                </span>
              </div>

              {/* Delete / close */}
              <div
                onClick={(e) => handleDelete(e, recipient.id)}
                className="w-4 h-4 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0 ml-0.5"
              >
                <svg className="w-2.5 h-2.5 text-[#636366]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
