# <Transaction /> · OnchainKit

> The `<Transaction />` components provide a high-level wrap around the entire transaction flow. It handles the transaction lifecycle, including gas estimation, fee sponsorship, and status updates.

export const Button = ({children, disabled, variant = "primary", size = "medium", iconName, roundedFull = false, className = '', fullWidth = false, onClick = undefined}) => {
  const variantStyles = {
    primary: 'bg-blue text-black border border-blue hover:bg-blue-80 active:bg-[#06318E] dark:text-white',
    secondary: 'bg-white border border-white text-palette-foreground hover:bg-zinc-15 active:bg-zinc-30',
    outlined: 'bg-transparent text-white border border-white hover:bg-white hover:text-black active:bg-[#E3E7E9]'
  };
  const sizeStyles = {
    medium: 'text-md px-4 py-2 gap-3',
    large: 'text-lg px-6 py-4 gap-5'
  };
  const sizeIconRatio = {
    medium: '0.75rem',
    large: '1rem'
  };
  const classes = ['text-md px-4 py-2 whitespace-nowrap', 'flex items-center justify-center', 'disabled:opacity-40 disabled:pointer-events-none', 'transition-all', variantStyles[variant], sizeStyles[size], roundedFull ? 'rounded-full' : 'rounded-lg', fullWidth ? 'w-full' : 'w-auto', className];
  const buttonClasses = classes.filter(Boolean).join(' ');
  const iconSize = sizeIconRatio[size];
  return <button type="button" disabled={disabled} className={buttonClasses} onClick={onClick}>
      <span>{children}</span>
      {iconName && <Icon name={iconName} width={iconSize} height={iconSize} color="currentColor" />}
    </button>;
};

export const BaseBanner = ({content = null, id, dismissable = true}) => {
  const LOCAL_STORAGE_KEY_PREFIX = 'cb-docs-banner';
  const [isVisible, setIsVisible] = useState(false);
  const onDismiss = () => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}-${id}`, 'false');
    setIsVisible(false);
  };
  useEffect(() => {
    const storedValue = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}-${id}`);
    setIsVisible(storedValue !== 'false');
  }, []);
  if (!isVisible) {
    return null;
  }
  return <div className="fixed bottom-0 left-0 right-0 bg-white py-8 px-4 lg:px-12 z-50 text-black dark:bg-black dark:text-white border-t dark:border-gray-95">
      <div className="flex items-center max-w-8xl mx-auto">
        {typeof content === 'function' ? content({
    onDismiss
  }) : content}
        {dismissable && <button onClick={onDismiss} className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label="Dismiss banner">
          ✕
        </button>}
      </div>
    </div>;
};

The `<Transaction />` components provide a high-level wrap around the entire transaction flow.
It handles the transaction lifecycle, including gas estimation, fee sponsorship, and status updates.

Before using them, ensure you've completed all [Getting Started steps](/onchainkit/getting-started).

## Quick start

The `Transaction` component now supports a simplified shorthand version to streamline the integration process for developers. Instead of manually defining each subcomponent and prop, you can render `Transaction` without children, and it will automatically include our suggested implementation — complete with the `TransactionButton` and `TransactionToast` components.

If you'd like more customization, follow the implementation guide for our `Transaction` components below.

```tsx
// @noErrors: 1109 - Cannot find name 'contracts'
import { Transaction } from "@coinbase/onchainkit/transaction"

const calls = [...];

<Transaction calls={calls} />
```

<iframe src="https://684b5e62b1ff46bc5bf83966-aijszlfakk.chromatic.com/iframe.html?args=&id=onchainkit-transaction--default&viewMode=story&dark=true&hero=true" width="100%" height="auto" />

{/* <App>
  <TransactionWrapper>
    {({ address, contracts, onStatus }) => {
      if (address) {
        return (
          <Transaction
            isSponsored={true}
            chainId={BASE_SEPOLIA_CHAIN_ID}
            calls={contracts}
            onStatus={onStatus}
          />
        )
      } else {
        return (
          <Wallet>
            <ConnectWallet>
              <Avatar className="h-6 w-6" />
              <Name />
            </ConnectWallet>
          </Wallet>
        )
      }
    }}
  </TransactionWrapper>
  </App> */}

### Props

[`TransactionReact`](/onchainkit/transaction/types#transactionreact)

## Walkthrough

<Steps>
  <Step title="Add calls">
    Execute one or multiple transactions using the Transaction component. You can pass transactions in either `Call` or `ContractFunctionParameters` format. The component will automatically apply batching logic if the user's wallet supports it.

    #### Types

    * [`ContractFunctionParameters`](https://github.com/wevm/viem/blob/ce1b8aff4d4523d3a324e500261c8c0867fd35e9/src/types/contract.ts#L188)
    * [`Call`](/onchainkit/transaction/types#call)

    <CodeGroup>
      ```tsx TransactionComponents.tsx
      // @noErrors: 2307
      import { useCallback } from 'react';
      import { Avatar, Name } from '@coinbase/onchainkit/identity';
      import { // [!code focus]
        Transaction, // [!code focus]
        TransactionButton,
        TransactionSponsor,
        TransactionStatus,
        TransactionStatusAction,
        TransactionStatusLabel,
      } from '@coinbase/onchainkit/transaction'; // [!code focus]
      import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
      import { Wallet, ConnectWallet } from '@coinbase/onchainkit/wallet';
      import { useAccount } from 'wagmi';
      import { calls } from '@/calls'; // [!code focus]

      // ---cut-start---

      const BASE_SEPOLIA_CHAIN_ID = 84532;
      // ---cut-end---

      export default function TransactionComponents() {
        const { address } = useAccount();

        const handleOnStatus = useCallback((status: LifecycleStatus) => {
          console.log('LifecycleStatus', status);
        }, []);

        return address ? (
          <Transaction // [!code focus]
            chainId={BASE_SEPOLIA_CHAIN_ID} // [!code focus]
            calls={calls} // [!code focus]
            onStatus={handleOnStatus} // [!code focus]
          >
            <TransactionButton />
            <TransactionSponsor />
            <TransactionStatus>
              <TransactionStatusLabel />
              <TransactionStatusAction />
            </TransactionStatus>
          </Transaction> // [!code focus]
        ) : (
          <Wallet>
            <ConnectWallet>
              <Avatar className='h-6 w-6' />
              <Name />
            </ConnectWallet>
          </Wallet>
        );
      };
      ```

      ```ts calls.ts
      const clickContractAddress = '0x67c97D1FB8184F038592b2109F854dfb09C77C75';
      const clickContractAbi = [
        {
          type: 'function',
          name: 'click',
          inputs: [],
          outputs: [],
          stateMutability: 'nonpayable',
        },
      ] as const;

      export const calls = [
        {
          address: clickContractAddress,
          abi: clickContractAbi,
          functionName: 'click',
          args: [],
        }
      ];
      ```
    </CodeGroup>

    <iframe src="https://684b5e62b1ff46bc5bf83966-aijszlfakk.chromatic.com/iframe.html?args=&id=onchainkit-transaction--types&viewMode=story&dark=true&hero=true" width="100%" height="auto" />

    {/* <App>
        <TransactionWrapper>
          {({ address, contracts, onStatus }) => {
            if (address) {
              return (
                <Transaction
                  isSponsored={true}
                  chainId={BASE_SEPOLIA_CHAIN_ID}
                  contracts={contracts}
                  onStatus={onStatus}
                >
                  <TransactionButton />
                  <TransactionSponsor />
                  <TransactionStatus>
                    <TransactionStatusLabel />
                    <TransactionStatusAction />
                  </TransactionStatus>
                </Transaction>
              )
            } else {
              return (
                <Wallet>
                  <ConnectWallet>
                    <Avatar className="h-6 w-6" />
                    <Name />
                  </ConnectWallet>
                </Wallet>
              )
            }
          }}

        </TransactionWrapper>
      </App> */}
  </Step>

  <Step title="Listen to LifecycleStatus">
    Take full control of your transactions data with the `LifecycleStatus` object via the `onStatus` prop.
    This TypeScript object provides `statusName` and `statusData` to keep you informed.

    ```tsx
    // @noErrors: 2307
    import { useCallback } from 'react';
    import {
      Transaction,
      TransactionButton,
      TransactionSponsor,
      TransactionStatus,
      TransactionToast,
      TransactionToastIcon,
      TransactionToastLabel,
      TransactionToastAction,
    } from '@coinbase/onchainkit/transaction';
    import {contracts} from '@/contracts';
    // ---cut-before---

    import type { LifecycleStatus } from '@coinbase/onchainkit/transaction'; // [!code focus]

    // omitted for brevity

    const handleOnStatus = useCallback((status: LifecycleStatus) => {  // [!code focus]
      console.log('Transaction status:', status); // [!code focus]
    }, []); // [!code focus]

    // omitted for brevity

    // Usage in component
    <Transaction  // [!code focus]
      contracts={contracts}
      onStatus={handleOnStatus} // [!code focus]
    >
      <TransactionButton />
      <TransactionSponsor />
      <TransactionToast>
        <TransactionToastIcon />
        <TransactionToastLabel />
        <TransactionToastAction />
      </TransactionToast>
    </Transaction>
    ```

    The Lifecycle Status features seven states for the transaction experience.

    ```ts
    import type { TransactionError } from "@coinbase/onchainkit/transaction";
    import type { Address, TransactionReceipt } from "viem";
    // ---cut-before---
    type LifecycleStatus =
      | {
          statusName: 'init';
          statusData: null;
        }
      | {
          statusName: 'error';
          statusData: TransactionError;
        }
      | {
          statusName: 'transactionIdle'; // initial status prior to the mutation function executing
          statusData: null;
        }
      | {
          statusName: 'buildingTransaction'; // resolving calls or contracts promise
          statusData: null;
        }
      | {
          statusName: 'transactionPending'; // if the mutation is currently executing
          statusData: null;
        }
      | {
          statusName: 'transactionLegacyExecuted';
          statusData: {
            transactionHashList: string[];
          };
        }
      | {
          statusName: 'success'; // if the last mutation attempt was successful
          statusData: {
            transactionReceipts: TransactionReceipt[];
          };
        };
    ```
  </Step>

  <Step title="Sponsor with Paymaster capabilities">
    To sponsor your transactions with Paymaster capabilities, configure your [`OnchainKitProvider`](/onchainkit/config/onchainkit-provider) with the appropriate `config.paymaster` URL, then pass `isSponsored={true}` to the `Transaction` component.

    Obtain a Paymaster and Bundler endpoint from the [Coinbase Developer Platform](https://portal.cdp.coinbase.com/products/bundler-and-paymaster).

    <Frame>
      <img alt="OnchainKit Paymaster and Bundler endpoint" title="OnchainKit Paymaster and Bundler endpoint" src="https://mintlify.s3.us-west-1.amazonaws.com/base-a060aa97/images/onchainkit/onchainkit-components-paymaster-endpoint.png" width="702" loading="lazy" />
    </Frame>

    ```tsx
    // @noErrors:  2304 17008 1005
    <OnchainKitProvider
      config={{ // [!code focus]
        paymaster: process.env.PAYMASTER_ENDPOINT, // [!code focus]
      }} // [!code focus]
    >
    ```

    Next, pass `isSponsored={true}` to the `Transaction` component.

    ```tsx
    // @noErrors: 2580 2304 2322 - Cannot find name 'process', Cannot find name 'contracts'
    import { Transaction, TransactionButton, TransactionSponsor } from "@coinbase/onchainkit/transaction"
    // ---cut-before---
    // omitted for brevity
    <Transaction
      isSponsored={true} // [!code focus]
      contracts={contracts} // [!code focus]
    >
      <TransactionButton />
      <TransactionSponsor />
    </Transaction>
    ```
  </Step>
</Steps>

### Using `calls` with Promises

`Calls` also accepts asynchronous functions that are resolved on each button click. This can be useful if you're calling an API to retrieve transaction data.

These functions must resolve to `Call[]` or `ContractFunctionParameters[]`.

In the example the calls data will be fetched from api.transaction.com when the user clicks the Transaction Button.

```tsx
// @noErrors: 2322
import { Transaction, TransactionButton, LifecycleStatus} from '@coinbase/onchainkit/transaction';
import { baseSepolia } from 'wagmi/chains';

// ---cut-before---

const callsCallback = async () => { // [!code focus]
  const res = await fetch('api.transaction.com/createTransaction'); // [!code focus]
  const callData = await res.json(); // [!code focus]
  return callData; // [!code focus]
} // [!code focus]

export default function TransactionWithCalls() {

  return (
    <Transaction
      chainId={baseSepolia.id}
      calls={callsCallback} // [!code focus]
      onStatus={(status: LifecycleStatus) => console.log('Transaction status:', status)}
    >
      <TransactionButton />
    </Transaction>
  );
}
```

## Components

<Frame>
  <div className="flex flex-col max-w-[648px] gap-6">
    <img src="https://mintlify.s3.us-west-1.amazonaws.com/base-a060aa97/images/onchainkit/onchainkit-components-transaction-anatomy.png" alt="OnchainKit transaction anatomy component diagram" title="Visual breakdown of OnchainKit transaction components" width="648" loading="lazy" />
  </div>
</Frame>

The components are designed to work together hierarchically. For each component, ensure the following:

* `<Transaction />` - Serves as the main container for all transaction-related components.
* `<TransactionButton />` - Handles the transaction initiation process.
* `<TransactionSponsor />` - Displays information about the sponsorship of transaction gas fees.
* `<TransactionStatus />` - Contains transaction status information and actions.
* `<TransactionStatusLabel />` - Displays the current status of the transaction.
* `<TransactionStatusAction />` - Provides additional actions based on the transaction status.
* `<TransactionToast />` - Displays a toast notification for the transaction status.
* `<TransactionToastIcon />` - Displays an icon in the transaction toast notification.
* `<TransactionToastLabel />` - Displays the label text in the transaction toast notification.
* `<TransactionToastAction />` - Provides additional actions within the transaction toast notification.

## Component types

* [`TransactionButtonReact`](/onchainkit/transaction/types#transactionbuttonreact)
* [`TransactionError`](/onchainkit/transaction/types#transactionerror)
* [`TransactionDefaultReact`](/onchainkit/transaction/types#transactiondefaultreact)
* [`TransactionReact`](/onchainkit/transaction/types#transactionreact)
* [`TransactionSponsorReact`](/onchainkit/transaction/types#transactionsponsorreact)
* [`TransactionStatusReact`](/onchainkit/transaction/types#transactionstatusreact)
* [`TransactionStatusActionReact`](/onchainkit/transaction/types#transactionstatusactionreact)
* [`TransactionStatusLabelReact`](/onchainkit/transaction/types#transactionstatuslabelreact)
* [`TransactionToastReact`](/onchainkit/transaction/types#transactiontoastreact)
* [`TransactionToastActionReact`](/onchainkit/transaction/types#transactiontoastactionreact)
* [`TransactionToastIconReact`](/onchainkit/transaction/types#transactiontoasticonreact)
* [`TransactionToastLabelReact`](/onchainkit/transaction/types#transactiontoastlabelreact)

<BaseBanner
  id="privacy-policy"
  dismissable={false}
  content={({ onDismiss }) => (
  <div className="flex items-center">
    <div className="mr-2">
      We're updating the Base Privacy Policy, effective July 25, 2025, to reflect an expansion of Base services. Please review the updated policy here:{" "}
      <a
        href="https://docs.base.org/privacy-policy-2025"
        target="_blank"
        className="whitespace-nowrap"
      >
        Base Privacy Policy
      </a>. By continuing to use Base services, you confirm that you have read and understand the updated policy.
    </div>
    <Button onClick={onDismiss}>I Acknowledge</Button>
  </div>
)}
/>



# getAddress

export const Button = ({children, disabled, variant = "primary", size = "medium", iconName, roundedFull = false, className = '', fullWidth = false, onClick = undefined}) => {
  const variantStyles = {
    primary: 'bg-blue text-black border border-blue hover:bg-blue-80 active:bg-[#06318E] dark:text-white',
    secondary: 'bg-white border border-white text-palette-foreground hover:bg-zinc-15 active:bg-zinc-30',
    outlined: 'bg-transparent text-white border border-white hover:bg-white hover:text-black active:bg-[#E3E7E9]'
  };
  const sizeStyles = {
    medium: 'text-md px-4 py-2 gap-3',
    large: 'text-lg px-6 py-4 gap-5'
  };
  const sizeIconRatio = {
    medium: '0.75rem',
    large: '1rem'
  };
  const classes = ['text-md px-4 py-2 whitespace-nowrap', 'flex items-center justify-center', 'disabled:opacity-40 disabled:pointer-events-none', 'transition-all', variantStyles[variant], sizeStyles[size], roundedFull ? 'rounded-full' : 'rounded-lg', fullWidth ? 'w-full' : 'w-auto', className];
  const buttonClasses = classes.filter(Boolean).join(' ');
  const iconSize = sizeIconRatio[size];
  return <button type="button" disabled={disabled} className={buttonClasses} onClick={onClick}>
      <span>{children}</span>
      {iconName && <Icon name={iconName} width={iconSize} height={iconSize} color="currentColor" />}
    </button>;
};

export const BaseBanner = ({content = null, id, dismissable = true}) => {
  const LOCAL_STORAGE_KEY_PREFIX = 'cb-docs-banner';
  const [isVisible, setIsVisible] = useState(false);
  const onDismiss = () => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}-${id}`, 'false');
    setIsVisible(false);
  };
  useEffect(() => {
    const storedValue = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}-${id}`);
    setIsVisible(storedValue !== 'false');
  }, []);
  if (!isVisible) {
    return null;
  }
  return <div className="fixed bottom-0 left-0 right-0 bg-white py-8 px-4 lg:px-12 z-50 text-black dark:bg-black dark:text-white border-t dark:border-gray-95">
      <div className="flex items-center max-w-8xl mx-auto">
        {typeof content === 'function' ? content({
    onDismiss
  }) : content}
        {dismissable && <button onClick={onDismiss} className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label="Dismiss banner">
          ✕
        </button>}
      </div>
    </div>;
};

The `getAddress` utility is designed to retrieve an address from an onchain identity provider for a given name.

## Usage

Get ENS Name from mainnet chain

<CodeGroup>
  ```tsx code
  import { getAddress } from '@coinbase/onchainkit/identity';

  const address = await getAddress({ name: 'zizzamia.eth' });
  ```

  ```ts return value
  0x02feeb0AdE57b6adEEdE5A4EEea6Cf8c21BeB6B1
  ```
</CodeGroup>

Get Basename from base chain

<CodeGroup>
  ```tsx code
  import { getAddress } from '@coinbase/onchainkit/identity';
  import { base } from 'viem/chains';

  const address = await getAddress({ name: 'zizzamia.base.eth', chain: base });
  ```

  ```ts return value
  0x02feeb0AdE57b6adEEdE5A4EEea6Cf8c21BeB6B1
  ```
</CodeGroup>

## Returns

See [`GetAddressReturnType`](/onchainkit/identity/types#getaddressreturntype) and [`GetAddress`](/onchainkit/identity/types#getaddress) for more details.

## Parameters

See [`GetAddressReturnType`](/onchainkit/identity/types#getaddressreturntype) and [`GetAddress`](/onchainkit/identity/types#getaddress) for more details.

<BaseBanner
  id="privacy-policy"
  dismissable={false}
  content={({ onDismiss }) => (
  <div className="flex items-center">
    <div className="mr-2">
      We're updating the Base Privacy Policy, effective July 25, 2025, to reflect an expansion of Base services. Please review the updated policy here:{" "}
      <a
        href="https://docs.base.org/privacy-policy-2025"
        target="_blank"
        className="whitespace-nowrap"
      >
        Base Privacy Policy
      </a>. By continuing to use Base services, you confirm that you have read and understand the updated policy.
    </div>
    <Button onClick={onDismiss}>I Acknowledge</Button>
  </div>
)}
/>
