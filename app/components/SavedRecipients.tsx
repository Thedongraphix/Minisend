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
    // Reset other swiped items
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
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#98989F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[#98989F] text-[13px] font-medium">Frequently Used</span>
        </div>
      </div>

      <div className="ios-card rounded-2xl overflow-hidden">
        {recipients.map((recipient, index) => {
          const isSelected = isMobileType
            ? recipient.phoneNumber === currentPhone
            : recipient.accountNumber === currentAccount;
          const isDeleting = deletingId === recipient.id;
          const isSwiped = swipingId === recipient.id;

          return (
            <div
              key={recipient.id}
              className={`relative overflow-hidden ${isDeleting ? 'animate-ios-reveal' : ''}`}
              style={isDeleting ? { maxHeight: 0, opacity: 0, transition: 'all 0.2s ease-out' } : {}}
            >
              {/* Swipe-to-delete background */}
              <div className="absolute inset-y-0 right-0 flex items-center bg-[#FF3B30] z-0">
                <button
                  onClick={(e) => handleDelete(e, recipient.id)}
                  className="h-full px-5 flex items-center justify-center"
                >
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Main row content */}
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
                  ${isSelected ? 'bg-[#007AFF]/[0.08]' : 'bg-white/[0.02] active:bg-white/[0.06]'}
                `}
              >
                <div className="flex items-center px-4 py-3">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? 'bg-[#007AFF] text-white'
                      : 'bg-[#2c2c2e] text-[#98989F]'
                  }`}>
                    <span className="text-[15px] font-semibold">
                      {recipient.accountName.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-[15px] font-medium truncate">
                        {sanitizeDisplay(recipient.accountName)}
                      </span>
                      {recipient.useCount > 1 && (
                        <span className="text-[#636366] text-[11px] flex-shrink-0">
                          {recipient.useCount}x
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[#98989F] text-[13px] truncate">
                        {isMobileType
                          ? sanitizeDisplay(recipient.phoneNumber)
                          : sanitizeDisplay(recipient.accountNumber)
                        }
                      </span>
                      {currency === 'NGN' && recipient.bankName && (
                        <>
                          <span className="text-[#48484A] text-[11px]">·</span>
                          <span className="text-[#636366] text-[13px] truncate">
                            {sanitizeDisplay(recipient.bankName)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Selection indicator */}
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-[#007AFF] flex items-center justify-center flex-shrink-0 ml-2">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <svg className="w-4 h-4 text-[#48484A] flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              </button>

              {/* Divider */}
              {index < recipients.length - 1 && !isDeleting && (
                <div className="h-px bg-white/[0.04] ml-[68px]" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
