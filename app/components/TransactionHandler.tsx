"use client";

import { Transaction, TransactionButton, TransactionStatus, TransactionStatusLabel, TransactionStatusAction } from '@coinbase/onchainkit/transaction';
import { base } from 'wagmi/chains';
import type { ContractFunctionParameters } from 'viem';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';

interface TransactionHandlerProps {
  calls: ContractFunctionParameters[];
  chainId?: number;
  onStatus?: (status: LifecycleStatus) => void;
  onSuccess?: (response: unknown) => void;
  onError?: (error: unknown) => void;
  buttonText?: string;
  children?: React.ReactNode;
}

export function TransactionHandler({
  calls,
  chainId = base.id,
  onStatus,
  onSuccess,
  onError,
  buttonText = "Complete Transaction",
  children,
}: TransactionHandlerProps) {

  return (
    <div>
      {/* OnchainKit Transaction with CDP paymaster */}
      <Transaction
        chainId={chainId}
        calls={calls}
        onStatus={onStatus}
        onSuccess={onSuccess}
        onError={onError}
      >
        {children || (
          <>
            <TransactionButton
              text={buttonText}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg"
            />

            <TransactionStatus>
              <TransactionStatusLabel />
              <TransactionStatusAction />
            </TransactionStatus>
          </>
        )}
      </Transaction>
    </div>
  );
}