"use client";

import { useState, useEffect, useRef } from 'react';
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
  currency: 'KES' | 'NGN' | 'GHS' | 'UGX';
  onSelect: (recipient: SavedRecipient) => void;
  currentPhone?: string;
  currentAccount?: string;
}

export function SavedRecipients({ currency, onSelect, currentPhone, currentAccount }: SavedRecipientsProps) {
  const [recipients, setRecipients] = useState<SavedRecipient[]>([]);
  const [mounted, setMounted] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const touchStartX = useRef(0);

  useEffect(() => {
    setMounted(true);
    loadRecipients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  const loadRecipients = () => {
    const saved = getRecipientsByCurrency(currency);
    setRecipients(saved);
  };

  const handleDelete = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    setTimeout(() => {
      deleteRecipient(id);
      loadRecipients();
      setDeletingId(null);
      setSwipingId(null);
    }, 200);
  };

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    touchStartX.current = e.touches[0].clientX;
    if (swipingId && swipingId !== id) {
      setSwipingId(null);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, id: string) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (diff > 60) {
      setSwipingId(id);
    } else if (diff < -30) {
      setSwipingId(null);
    }
  };

  if (!mounted || recipients.length === 0) {
    return null;
  }

  const isMobileType = currency === 'KES' || currency === 'GHS' || currency === 'UGX';

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-2 px-1">
        <svg className="w-3.5 h-3.5 text-[#636366]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[#636366] text-[12px] font-medium">Recent</span>
      </div>

      <div className="rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.04]">
        {recipients.map((recipient, index) => {
          const isSelected = isMobileType
            ? recipient.phoneNumber === currentPhone
            : recipient.accountNumber === currentAccount;
          const isDeleting = deletingId === recipient.id;
          const isSwiped = swipingId === recipient.id;

          return (
            <div
              key={recipient.id}
              className="relative overflow-hidden"
              style={isDeleting ? { maxHeight: 0, opacity: 0, transition: 'all 0.2s ease-out' } : {}}
            >
              {/* Swipe-to-delete background */}
              <div className="absolute inset-y-0 right-0 flex items-center bg-[#FF3B30] z-0">
                <button
                  onClick={(e) => handleDelete(e, recipient.id)}
                  className="h-full px-5 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Main row */}
              <button
                onClick={() => {
                  if (isSwiped) {
                    setSwipingId(null);
                    return;
                  }
                  onSelect(recipient);
                }}
                onTouchStart={(e) => handleTouchStart(e, recipient.id)}
                onTouchEnd={(e) => handleTouchEnd(e, recipient.id)}
                className={`
                  relative w-full text-left z-10 transition-transform duration-200 ease-out
                  ${isSwiped ? '-translate-x-[72px]' : 'translate-x-0'}
                  ${isSelected ? 'bg-white/[0.04]' : 'bg-transparent active:bg-white/[0.04]'}
                `}
              >
                <div className="flex items-center px-3 py-2.5">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-[#2c2c2e] flex items-center justify-center flex-shrink-0">
                    <span className="text-[13px] font-semibold text-[#98989F]">
                      {recipient.accountName.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="ml-2.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-[14px] font-medium truncate">
                        {sanitizeDisplay(recipient.accountName)}
                      </span>
                      {recipient.useCount > 1 && (
                        <span className="text-[#48484A] text-[10px] flex-shrink-0">
                          {recipient.useCount}x
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-px">
                      <span className="text-[#636366] text-[12px] truncate">
                        {isMobileType
                          ? sanitizeDisplay(recipient.phoneNumber)
                          : sanitizeDisplay(recipient.accountNumber)
                        }
                      </span>
                      {currency === 'NGN' && recipient.bankName && (
                        <>
                          <span className="text-[#3a3a3c] text-[10px]">·</span>
                          <span className="text-[#48484A] text-[12px] truncate">
                            {sanitizeDisplay(recipient.bankName)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Checkmark or chevron */}
                  {isSelected ? (
                    <svg className="w-4 h-4 text-[#98989F] flex-shrink-0 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-[#3a3a3c] flex-shrink-0 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </button>

              {/* Divider */}
              {index < recipients.length - 1 && !isDeleting && (
                <div className="h-px bg-white/[0.04] ml-[52px]" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
