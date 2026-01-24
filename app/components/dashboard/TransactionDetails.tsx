'use client';

import { PretiumOrder } from '@/lib/supabase/config';
import { getBaseScanTxUrl, getBaseScanAddressUrl, truncateHash, copyToClipboard, formatEATDate, getTimeDifference } from '@/lib/basescan-utils';
import { useState } from 'react';

interface TransactionDetailsProps {
  order: PretiumOrder;
}

export function TransactionDetails({ order }: TransactionDetailsProps) {
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const handleCopy = async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  const getDestination = () => {
    if (order.payment_type === 'MOBILE') return order.phone_number;
    if (order.payment_type === 'BUY_GOODS') return `Till: ${order.till_number}`;
    if (order.payment_type === 'PAYBILL') return `Paybill: ${order.paybill_number} (${order.paybill_account})`;
    return 'N/A';
  };

  const DetailRow = ({ label, value, mono, copyable, copyKey, link }: {
    label: string;
    value: React.ReactNode;
    mono?: boolean;
    copyable?: string;
    copyKey?: string;
    link?: string;
  }) => (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[13px] text-white/40">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-[13px] text-white/90 ${mono ? 'font-mono' : ''}`}>{value}</span>
        {copyable && copyKey && (
          <button
            onClick={() => handleCopy(copyable, copyKey)}
            className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            {copySuccess === copyKey ? 'Copied' : 'Copy'}
          </button>
        )}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            View
          </a>
        )}
      </div>
    </div>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <h4 className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-1">{title}</h4>
      <div className="divide-y divide-white/[0.04]">{children}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Transaction Info */}
        <Section title="Transaction">
          <DetailRow
            label="Code"
            value={order.transaction_code}
            mono
            copyable={order.transaction_code}
            copyKey="code"
          />
          {order.transaction_hash && (
            <DetailRow
              label="Blockchain Tx"
              value={truncateHash(order.transaction_hash)}
              mono
              copyable={order.transaction_hash}
              copyKey="hash"
              link={getBaseScanTxUrl(order.transaction_hash)}
            />
          )}
        </Section>

        {/* Financial Details */}
        <Section title="Financial">
          <DetailRow label="USDC Amount" value={`${order.amount_in_usdc} USDC`} />
          <DetailRow label={`${order.local_currency} Amount`} value={`${order.amount_in_local?.toLocaleString()} ${order.local_currency}`} />
          <DetailRow label="Exchange Rate" value={order.exchange_rate} />
          <DetailRow label="Fee (1%)" value={`${order.sender_fee} ${order.local_currency}`} />
        </Section>

        {/* Payment Info */}
        <Section title="Payment">
          <DetailRow label="Type" value={order.payment_type} />
          <DetailRow label="Destination" value={getDestination()} />
          {order.account_name && (
            <DetailRow label="Account Name" value={order.account_name} />
          )}
          <DetailRow label="Network" value={order.mobile_network || 'SAFARICOM'} />
        </Section>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Timeline */}
        <Section title="Timeline">
          <DetailRow label="Created" value={formatEATDate(order.created_at)} />
          {order.completed_at && (
            <>
              <DetailRow label="Completed" value={formatEATDate(order.completed_at)} />
              <DetailRow
                label="Duration"
                value={
                  <span className="text-emerald-400">
                    {getTimeDifference(order.created_at, order.completed_at)}
                  </span>
                }
              />
            </>
          )}
        </Section>

        {/* Receipt */}
        {order.receipt_number && (
          <Section title="Receipt">
            <DetailRow label="M-Pesa Code" value={order.receipt_number} mono />
            {order.public_name && (
              <DetailRow label="Recipient" value={order.public_name} />
            )}
          </Section>
        )}

        {/* Addresses */}
        <Section title="Addresses">
          <DetailRow
            label="Wallet"
            value={truncateHash(order.wallet_address, 8, 6)}
            mono
            copyable={order.wallet_address}
            copyKey="wallet"
            link={getBaseScanAddressUrl(order.wallet_address)}
          />
          {order.settlement_address && (
            <DetailRow
              label="Settlement"
              value={truncateHash(order.settlement_address, 8, 6)}
              mono
              link={getBaseScanAddressUrl(order.settlement_address)}
            />
          )}
          {order.fid && (
            <DetailRow label="Farcaster ID" value={order.fid} />
          )}
        </Section>
      </div>
    </div>
  );
}
