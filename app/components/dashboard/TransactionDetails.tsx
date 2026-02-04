'use client';

import { UnifiedOrder } from '@/lib/types/dashboard';
import { PretiumOrder, Order } from '@/lib/supabase/config';
import { getBaseScanTxUrl, getBaseScanAddressUrl, truncateHash, copyToClipboard, formatEATDate, getTimeDifference } from '@/lib/basescan-utils';
import { useState } from 'react';

interface TransactionDetailsProps {
  order: UnifiedOrder;
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
    if (order.provider === 'pretium') {
      const raw = order.raw as PretiumOrder;
      if (raw.payment_type === 'MOBILE') return raw.phone_number;
      if (raw.payment_type === 'BUY_GOODS') return `Till: ${raw.till_number}`;
      if (raw.payment_type === 'PAYBILL') return `Paybill: ${raw.paybill_number} (${raw.paybill_account})`;
      return 'N/A';
    }
    // Paycrest
    const raw = order.raw as Order;
    if (raw.phone_number) return raw.phone_number;
    if (raw.account_number) return `${raw.bank_name || 'Bank'}: ${raw.account_number}`;
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
            label="Provider"
            value={
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                order.provider === 'pretium'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
              }`}>
                {order.provider === 'pretium' ? 'Pretium' : 'Paycrest'}
              </span>
            }
          />
          <DetailRow
            label={order.provider === 'pretium' ? 'Transaction Code' : 'Order ID'}
            value={order.orderId}
            mono
            copyable={order.orderId}
            copyKey="code"
          />
          {order.transactionHash && (
            <DetailRow
              label="Blockchain Tx"
              value={truncateHash(order.transactionHash)}
              mono
              copyable={order.transactionHash}
              copyKey="hash"
              link={getBaseScanTxUrl(order.transactionHash)}
            />
          )}
        </Section>

        {/* Financial Details */}
        <Section title="Financial">
          <DetailRow label="USDC Amount" value={`${order.amountInUsdc} USDC`} />
          <DetailRow label={`${order.localCurrency} Amount`} value={`${order.amountInLocal?.toLocaleString()} ${order.localCurrency}`} />
          {order.exchangeRate && (
            <DetailRow label="Exchange Rate" value={order.exchangeRate} />
          )}
          <DetailRow label="Fee" value={`${order.senderFee} USDC`} />
        </Section>

        {/* Payment Info */}
        <Section title="Payment">
          <DetailRow label="Type" value={order.paymentType} />
          <DetailRow label="Destination" value={getDestination()} />
          {order.accountName && (
            <DetailRow label="Account Name" value={order.accountName} />
          )}
          {/* Provider-specific payment details */}
          {order.provider === 'pretium' && (
            <DetailRow label="Network" value={(order.raw as PretiumOrder).mobile_network || 'SAFARICOM'} />
          )}
          {order.provider === 'paycrest' && (order.raw as Order).institution_code && (
            <DetailRow label="Institution" value={(order.raw as Order).institution_code} />
          )}
          {order.provider === 'paycrest' && (order.raw as Order).bank_name && (
            <DetailRow label="Bank" value={(order.raw as Order).bank_name} />
          )}
        </Section>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Timeline */}
        <Section title="Timeline">
          <DetailRow label="Created" value={formatEATDate(order.createdAt)} />
          {order.completedAt && (
            <>
              <DetailRow label="Completed" value={formatEATDate(order.completedAt)} />
              <DetailRow
                label="Duration"
                value={
                  <span className="text-emerald-400">
                    {getTimeDifference(order.createdAt, order.completedAt)}
                  </span>
                }
              />
            </>
          )}
        </Section>

        {/* Receipt (Pretium) */}
        {order.provider === 'pretium' && (order.raw as PretiumOrder).receipt_number && (
          <Section title="Receipt">
            <DetailRow label="M-Pesa Code" value={(order.raw as PretiumOrder).receipt_number} mono />
            {(order.raw as PretiumOrder).public_name && (
              <DetailRow label="Recipient" value={(order.raw as PretiumOrder).public_name} />
            )}
          </Section>
        )}

        {/* Paycrest-specific details */}
        {order.provider === 'paycrest' && (
          <Section title="Paycrest Details">
            {(order.raw as Order).paycrest_status && (
              <DetailRow label="Paycrest Status" value={(order.raw as Order).paycrest_status} />
            )}
            {(order.raw as Order).reference_id && (
              <DetailRow label="Reference ID" value={(order.raw as Order).reference_id} mono />
            )}
            {(order.raw as Order).receive_address && (
              <DetailRow
                label="Receive Address"
                value={truncateHash((order.raw as Order).receive_address!, 8, 6)}
                mono
                copyable={(order.raw as Order).receive_address}
                copyKey="receive"
              />
            )}
          </Section>
        )}

        {/* Addresses */}
        <Section title="Addresses">
          <DetailRow
            label="Wallet"
            value={truncateHash(order.walletAddress, 8, 6)}
            mono
            copyable={order.walletAddress}
            copyKey="wallet"
            link={getBaseScanAddressUrl(order.walletAddress)}
          />
          {order.provider === 'pretium' && (order.raw as PretiumOrder).settlement_address && (
            <DetailRow
              label="Settlement"
              value={truncateHash((order.raw as PretiumOrder).settlement_address!, 8, 6)}
              mono
              link={getBaseScanAddressUrl((order.raw as PretiumOrder).settlement_address!)}
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
