"use client";

// import { useState } from 'react';
import { Transaction, TransactionButton, TransactionStatus, TransactionStatusLabel, TransactionStatusAction } from '@coinbase/onchainkit/transaction';
import { base } from 'wagmi/chains';
import type { ContractFunctionParameters } from 'viem';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
// import { SwipeButton } from './SwipeButton';

interface TransactionHandlerProps {
  calls: ContractFunctionParameters[];
  chainId?: number;
  onStatus?: (status: LifecycleStatus) => void;
  onSuccess?: (response: unknown) => void;
  onError?: (error: unknown) => void;
  buttonText?: string;
  // useSwipe?: boolean;
  children?: React.ReactNode;
}

export function TransactionHandler({
  calls,
  chainId = base.id,
  onStatus,
  onSuccess,
  onError,
  buttonText = "Complete Transaction",
  // useSwipe = false,
  children,
}: TransactionHandlerProps) {
  // const [showTransaction, setShowTransaction] = useState(!useSwipe);

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
            {/* {useSwipe && !showTransaction ? (
              <SwipeButton
                text="Swipe to send"
                onComplete={() => setShowTransaction(true)}
              />
            ) : ( */}
              <TransactionButton
                text={buttonText}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg"
              />
            {/* )} */}

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