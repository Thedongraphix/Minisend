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


# <Swap /> · OnchainKit

> Swap components & utilities

export const Danger = ({children}) => {
  return <div class="my-4 px-5 py-4 overflow-hidden rounded-2xl flex gap-3 border danger-admonition dark:danger-admonition">
      <div class="mt-0.5 w-4">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="rgb(239, 68, 68)" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-sky-500" aria-label="Danger">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M7 1.3C10.14 1.3 12.7 3.86 12.7 7C12.7 10.14 10.14 12.7 7 12.7C5.48908 12.6974 4.0408 12.096 2.97241 11.0276C1.90403 9.9592 1.30264 8.51092 1.3 7C1.3 3.86 3.86 1.3 7 1.3ZM7 0C3.14 0 0 3.14 0 7C0 10.86 3.14 14 7 14C10.86 14 14 10.86 14 7C14 3.14 10.86 0 7 0ZM8 3H6V8H8V3ZM8 9H6V11H8V9Z"></path>
        </svg>
      </div>
      <div class="text-sm prose min-w-0">
        {children}
      </div>
    </div>;
};

The `Swap` components provide a comprehensive interface for users to execute [Token](/onchainkit/token/types#token) swaps.

Before using them, ensure you've completed all [Getting Started steps](/onchainkit/getting-started).

## Quick start

The `SwapDefault` component is a simplified version of the `Swap` component, designed to streamline the integration process for developers. Instead of manually defining each subcomponent and prop, developers can use this shorthand version which renders our suggested implementation of the component and includes `SwapAmountInput`, `SwapSettings`, `SwapToggleButton`, `SwapButton`, and `SwapToast`.

If you'd like more customization, follow the implementation guide for our `Swap` component below.

```tsx
import { SwapDefault } from '@coinbase/onchainkit/swap'; // [!code focus]
import type { Token } from '@coinbase/onchainkit/token';

const eth: Token = {
  name: 'ETH',
  address: '',
  symbol: 'ETH',
  decimals: 18,
  image:
    'https://wallet-api-production.s3.amazonaws.com/uploads/tokens/eth_288.png',
  chainId: 8453,
};

const usdc: Token = {
  name: 'USDC',
  address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  symbol: 'USDC',
  decimals: 6,
  image:
    'https://d3r81g40ycuhqg.cloudfront.net/wallet/wais/44/2b/442b80bd16af0c0d9b22e03a16753823fe826e5bfd457292b55fa0ba8c1ba213-ZWUzYjJmZGUtMDYxNy00NDcyLTg0NjQtMWI4OGEwYjBiODE2',
  chainId: 8453,
};

<SwapDefault // [!code focus]
  from={[eth]} // [!code focus]
  to={[usdc]} // [!code focus]
/> // [!code focus]
```

<iframe src="https://684b5e62b1ff46bc5bf83966-aijszlfakk.chromatic.com/iframe.html?args=&id=onchainkit-swap-swap--default&viewMode=story&dark=true&hero=true" width="100%" height="520px" />

{/* <App>
  <SwapWrapper>
    {({ address, swappableTokens }) => {
      if (address) {
        return (
          <SwapDefault from={swappableTokens} to={swappableTokens.slice().reverse()} disabled />
        )
      }
      return <>
        <Wallet>
          <ConnectWallet>
            <Avatar className="h-6 w-6" />
            <Name />
          </ConnectWallet>
        </Wallet>
      </>;
    }}
  </SwapWrapper>
  </App> */}

### Props

[`SwapDefaultReact`](/onchainkit/swap/types#swapdefaultreact)

## Usage

Example using `@coinbase/onchainkit/swap` and `@coinbase/onchainkit/wallet`.

```tsx
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import { // [!code focus]
  Swap, // [!code focus]
  SwapAmountInput, // [!code focus]
  SwapToggleButton, // [!code focus]
  SwapButton, // [!code focus]
  SwapMessage, // [!code focus]
  SwapToast, // [!code focus]
} from '@coinbase/onchainkit/swap'; // [!code focus]
import { Wallet, ConnectWallet } from '@coinbase/onchainkit/wallet';
import { useAccount } from 'wagmi';
import type { Token } from '@coinbase/onchainkit/token';

export default function SwapComponents() {
  const { address } = useAccount();

  const ETHToken: Token = {
    address: "",
    chainId: 8453,
    decimals: 18,
    name: "Ethereum",
    symbol: "ETH",
    image: "https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png",
  };

  const USDCToken: Token = {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    chainId: 8453,
    decimals: 6,
    name: "USDC",
    symbol: "USDC",
    image: "https://dynamic-assets.coinbase.com/3c15df5e2ac7d4abbe9499ed9335041f00c620f28e8de2f93474a9f432058742cdf4674bd43f309e69778a26969372310135be97eb183d91c492154176d455b8/asset_icons/9d67b728b6c8f457717154b3a35f9ddc702eae7e76c4684ee39302c4d7fd0bb8.png",
  };

  // add other tokens here to display them as options in the swap
  const swappableTokens: Token[] = [ETHToken, USDCToken];


  return address ? (
    <Swap> // [!code focus]
      <SwapAmountInput // [!code focus]
        label="Sell" // [!code focus]
        swappableTokens={swappableTokens} // [!code focus]
        token={ETHToken} // [!code focus]
        type="from" // [!code focus]
      /> // [!code focus]
      <SwapToggleButton /> // [!code focus]
      <SwapAmountInput // [!code focus]
        label="Buy" // [!code focus]
        swappableTokens={swappableTokens} // [!code focus]
        token={USDCToken} // [!code focus]
        type="to" // [!code focus]
      /> // [!code focus]
      <SwapButton /> // [!code focus]
      <SwapMessage /> // [!code focus]
      <SwapToast /> // [!code focus]
    </Swap> // [!code focus]
  ) : (
    <Wallet>
      <ConnectWallet>
        <Avatar className="h-6 w-6" />
        <Name />
      </ConnectWallet>
    </Wallet>
  );
}
```

<iframe src="https://684b5e62b1ff46bc5bf83966-aijszlfakk.chromatic.com/iframe.html?args=&id=onchainkit-swap-swap--full-swap&viewMode=story&dark=true&hero=true" width="100%" height="520px" />

{/* <App>
  <SwapWrapper>
    {({ address, swappableTokens }) => {
      if (address) {
        return (
          <Swap>
            <SwapAmountInput
              label="Sell"
              swappableTokens={swappableTokens}
              token={swappableTokens[1]}
              type="from"
            />
            <SwapToggleButton />
            <SwapAmountInput
              label="Buy"
              swappableTokens={swappableTokens}
              token={swappableTokens[2]}
              type="to"
            />
            <SwapButton disabled />
            <SwapMessage />
            <SwapToast />
          </Swap>
        )
      }
      return <>
        <Wallet>
          <ConnectWallet>
            <Avatar className="h-6 w-6" />
            <Name />
          </ConnectWallet>
        </Wallet>
      </>;
    }}
  </SwapWrapper>
  </App> */}

<Danger>
  **Note: This interface is for demonstration purposes only.**

  The swap will execute and work out of the box when you implement the component in your own app.
</Danger>

### Supported Swap Routers

The `Swap` component supports two swap routers:

* [Uniswap V3](https://app.uniswap.org/) (default)
* [0x Aggregator](https://0x.org/)

To use the 0x Aggregator, set the `experimental.useAggregator` prop to `true`.

### Sponsor gas with Paymaster

To sponsor swap transactions for your users, toggle the Paymaster using the `isSponsored` prop.

By default, this will use the [Coinbase Developer Platform](https://portal.cdp.coinbase.com/products/bundler-and-paymaster) Paymaster.

You can configure sponsorship settings on the [Paymaster](https://portal.cdp.coinbase.com/products/bundler-and-paymaster) page.
For security reasons, we recommend setting up a contract allowlist in the Portal. Without a contract allowlist defined, your Paymaster will only be able to sponsor up to \$1.

The contract used in our Swap API is Uniswap's [Universal Router](https://basescan.org/address/0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD), which is deployed on Base at `0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD`.

Note that gas sponsorship will only work for Smart Wallets.

```tsx
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import {
  Swap,
  SwapAmountInput,
  SwapToggleButton,
  SwapButton,
  SwapMessage,
} from '@coinbase/onchainkit/swap';
import { Wallet, ConnectWallet } from '@coinbase/onchainkit/wallet';
import { useAccount } from 'wagmi';
import type { Token } from '@coinbase/onchainkit/token';

export default function SwapComponents() {
  const { address } = useAccount();

  const ETHToken: Token = {
    address: "",
    chainId: 8453,
    decimals: 18,
    name: "Ethereum",
    symbol: "ETH",
    image: "https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png",
  };

  const USDCToken: Token = {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    chainId: 8453,
    decimals: 6,
    name: "USDC",
    symbol: "USDC",
    image: "https://dynamic-assets.coinbase.com/3c15df5e2ac7d4abbe9499ed9335041f00c620f28e8de2f93474a9f432058742cdf4674bd43f309e69778a26969372310135be97eb183d91c492154176d455b8/asset_icons/9d67b728b6c8f457717154b3a35f9ddc702eae7e76c4684ee39302c4d7fd0bb8.png",
  };

return (
// ---cut-before---
// omitted for brevity

// Set isSponsored to true // [!code focus]
<Swap isSponsored > // [!code focus]
  ...
</Swap> // [!code focus]
// ---cut-after---
);
}
```

### Custom token pair

You can adjust to only allow swap between a token pair.

```tsx
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import {
  Swap,
  SwapAmountInput,
  SwapToggleButton,
  SwapButton,
  SwapMessage,
  SwapToast,
} from '@coinbase/onchainkit/swap';
import { Wallet, ConnectWallet } from '@coinbase/onchainkit/wallet';
import { useAccount } from 'wagmi';
import type { Token } from '@coinbase/onchainkit/token';

export default function SwapComponents() {
  const { address } = useAccount();

  const ETHToken: Token = {
    address: "",
    chainId: 8453,
    decimals: 18,
    name: "Ethereum",
    symbol: "ETH",
    image: "https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png",
  };

  const USDCToken: Token = {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    chainId: 8453,
    decimals: 6,
    name: "USDC",
    symbol: "USDC",
    image: "https://dynamic-assets.coinbase.com/3c15df5e2ac7d4abbe9499ed9335041f00c620f28e8de2f93474a9f432058742cdf4674bd43f309e69778a26969372310135be97eb183d91c492154176d455b8/asset_icons/9d67b728b6c8f457717154b3a35f9ddc702eae7e76c4684ee39302c4d7fd0bb8.png",
  };

return (
// ---cut-before---
// omitted for brevity

<Swap> // [!code focus]
  <SwapAmountInput // [!code focus]
    label="Sell" // [!code focus]
    token={ETHToken} // [!code focus]
    type="from" // [!code focus]
  /> // [!code focus]
  <SwapToggleButton /> // [!code focus]
  <SwapAmountInput // [!code focus]
    label="Buy" // [!code focus]
    token={USDCToken} // [!code focus]
    type="to" // [!code focus]
  /> // [!code focus]
  <SwapButton /> // [!code focus]
  <SwapMessage /> // [!code focus]
  <SwapToast /> // [!code focus]
</Swap> // [!code focus]
// ---cut-after---
);
}
```

<iframe src="https://684b5e62b1ff46bc5bf83966-aijszlfakk.chromatic.com/iframe.html?args=&id=onchainkit-swap-swap--without-swappable-prop&viewMode=story&dark=true&hero=true" width="100%" height="520px" />

{/* <App>
  <SwapWrapper>
    {({ address, swappableTokens }) => {
      if (address) {
        return (
          <Swap>
            <SwapAmountInput
              label="Sell"
              token={swappableTokens[1]}
              type="from"
            />
            <SwapToggleButton />
            <SwapAmountInput
              label="Buy"
              token={swappableTokens[2]}
              type="to"
            />
            <SwapButton disabled />
            <SwapMessage />
            <SwapToast />
          </Swap>
        )
      }
      return <>
        <Wallet>
          <ConnectWallet>
            <Avatar className="h-6 w-6" />
            <Name />
          </ConnectWallet>
        </Wallet>
      </>;
    }}
  </SwapWrapper>
  </App> */}

### Remove toggle button

You can remove `SwapToggleButton` to make swap unidirectional.

```tsx
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import {
  Swap,
  SwapAmountInput,
  SwapToggleButton,
  SwapButton,
  SwapMessage,
  SwapToast,
} from '@coinbase/onchainkit/swap';
import { Wallet, ConnectWallet } from '@coinbase/onchainkit/wallet';
import { useAccount } from 'wagmi';
import type { Token } from '@coinbase/onchainkit/token';

export default function SwapComponents() {
  const { address } = useAccount();

  const ETHToken: Token = {
    address: "",
    chainId: 8453,
    decimals: 18,
    name: "Ethereum",
    symbol: "ETH",
    image: "https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png",
  };

  const USDCToken: Token = {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    chainId: 8453,
    decimals: 6,
    name: "USDC",
    symbol: "USDC",
    image: "https://dynamic-assets.coinbase.com/3c15df5e2ac7d4abbe9499ed9335041f00c620f28e8de2f93474a9f432058742cdf4674bd43f309e69778a26969372310135be97eb183d91c492154176d455b8/asset_icons/9d67b728b6c8f457717154b3a35f9ddc702eae7e76c4684ee39302c4d7fd0bb8.png",
  };

return (
// ---cut-before---
// omitted for brevity

<Swap> // [!code focus]
  <SwapAmountInput // [!code focus]
    label="Sell" // [!code focus]
    token={ETHToken} // [!code focus]
    type="from" // [!code focus]
  /> // [!code focus]
  <SwapAmountInput // [!code focus]
    label="Buy" // [!code focus]
    token={USDCToken} // [!code focus]
    type="to" // [!code focus]
  /> // [!code focus]
  <SwapButton /> // [!code focus]
  <SwapMessage /> // [!code focus]
  <SwapToast /> // [!code focus]
</Swap> // [!code focus]
// ---cut-after---
);
}
```

<iframe src="https://684b5e62b1ff46bc5bf83966-aijszlfakk.chromatic.com/iframe.html?args=&id=onchainkit-swap-swap--no-toggle&viewMode=story&dark=true&hero=true" width="100%" height="520px" />

{/* <App>
  <SwapWrapper>
    {({ address, swappableTokens }) => {
      if (address) {
        return (
          <Swap>
            <SwapAmountInput
              label="Sell"
              token={swappableTokens[1]}
              type="from"
            />
            <SwapAmountInput
              label="Buy"
              token={swappableTokens[2]}
              type="to"
            />
            <SwapButton disabled />
            <SwapMessage />
            <SwapToast />
          </Swap>
        )
      }
      return <>
        <Wallet>
          <ConnectWallet>
            <Avatar className="h-6 w-6" />
            <Name />
          </ConnectWallet>
        </Wallet>
      </>;
    }}
  </SwapWrapper>
  </App> */}

### Remove swap message

You can remove `SwapMessage` component.

```tsx
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import {
  Swap,
  SwapAmountInput,
  SwapToggleButton,
  SwapButton,
  SwapMessage,
  SwapToast,
} from '@coinbase/onchainkit/swap';
import { Wallet, ConnectWallet } from '@coinbase/onchainkit/wallet';
import { useAccount } from 'wagmi';
import type { Token } from '@coinbase/onchainkit/token';

export default function SwapComponents() {
  const { address } = useAccount();

  const ETHToken: Token = {
    address: "",
    chainId: 8453,
    decimals: 18,
    name: "Ethereum",
    symbol: "ETH",
    image: "https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png",
  };

  const USDCToken: Token = {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    chainId: 8453,
    decimals: 6,
    name: "USDC",
    symbol: "USDC",
    image: "https://dynamic-assets.coinbase.com/3c15df5e2ac7d4abbe9499ed9335041f00c620f28e8de2f93474a9f432058742cdf4674bd43f309e69778a26969372310135be97eb183d91c492154176d455b8/asset_icons/9d67b728b6c8f457717154b3a35f9ddc702eae7e76c4684ee39302c4d7fd0bb8.png",
  };

return (
// ---cut-before---
// omitted for brevity

<Swap> // [!code focus]
  <SwapAmountInput // [!code focus]
    label="Sell" // [!code focus]
    token={ETHToken} // [!code focus]
    type="from" // [!code focus]
  /> // [!code focus]
  <SwapToggleButton />
  <SwapAmountInput // [!code focus]
    label="Buy" // [!code focus]
    token={USDCToken} // [!code focus]
    type="to" // [!code focus]
  /> // [!code focus]
  <SwapButton /> // [!code focus]
  <SwapToast /> // [!code focus]
</Swap> // [!code focus]
// ---cut-after---
);
}
```

<iframe src="https://684b5e62b1ff46bc5bf83966-aijszlfakk.chromatic.com/iframe.html?args=&id=onchainkit-swap-swap--no-message&viewMode=story&dark=true&hero=true" width="100%" height="520px" />

{/* <App>
  <SwapWrapper>
    {({ address, swappableTokens }) => {
      if (address) {
        return (
          <Swap>
            <SwapAmountInput
              label="Sell"
              token={swappableTokens[1]}
              type="from"
            />
            <SwapToggleButton />
            <SwapAmountInput
              label="Buy"
              token={swappableTokens[2]}
              type="to"
            />
            <SwapButton disabled />
            <SwapToast />
          </Swap>
        )
      }
      return <>
        <Wallet>
          <ConnectWallet>
            <Avatar className="h-6 w-6" />
            <Name />
          </ConnectWallet>
        </Wallet>
      </>;
    }}
  </SwapWrapper>
  </App> */}

### Override styles

You can override component styles using `className`.

```tsx
import { Avatar, Name } from '@coinbase/onchainkit/identity';
import {
  Swap,
  SwapAmountInput,
  SwapToggleButton,
  SwapButton,
  SwapMessage,
  SwapToast,
} from '@coinbase/onchainkit/swap';
import { Wallet, ConnectWallet } from '@coinbase/onchainkit/wallet';
import { useAccount } from 'wagmi';
import type { Token } from '@coinbase/onchainkit/token';

export default function SwapComponents() {
  const { address } = useAccount();

  const ETHToken: Token = {
    address: "",
    chainId: 8453,
    decimals: 18,
    name: "Ethereum",
    symbol: "ETH",
    image: "https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png",
  };

  const USDCToken: Token = {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    chainId: 8453,
    decimals: 6,
    name: "USDC",
    symbol: "USDC",
    image: "https://dynamic-assets.coinbase.com/3c15df5e2ac7d4abbe9499ed9335041f00c620f28e8de2f93474a9f432058742cdf4674bd43f309e69778a26969372310135be97eb183d91c492154176d455b8/asset_icons/9d67b728b6c8f457717154b3a35f9ddc702eae7e76c4684ee39302c4d7fd0bb8.png",
  };

return (
// ---cut-before---
// omitted for brevity

<Swap>
  <SwapAmountInput
    label="Sell"
    token={ETHToken}
    type="from"
  />
  <SwapToggleButton className='border-[#EA580C]'/> // [!code focus]
  <SwapAmountInput
    label="Buy"
    token={USDCToken}
    type="to"
  />
  <SwapButton className='bg-[#EA580C]'/> // [!code focus]
  <SwapMessage />
  <SwapToast />
</Swap>
// ---cut-after---
);
}
```

<iframe src="https://684b5e62b1ff46bc5bf83966-aijszlfakk.chromatic.com/iframe.html?args=&id=onchainkit-swap-swap--styled&viewMode=story&dark=true&hero=true" width="100%" height="520px" />

{/* <App>
  <SwapWrapper>
    {({ address, swappableTokens }) => {
      if (address) {
        return (
          <Swap>
            <SwapAmountInput
              label="Sell"
              swappableTokens={swappableTokens}
              token={swappableTokens[1]}
              type="from"
            />
            <SwapToggleButton className='border-[#EA580C]' />
            <SwapAmountInput
              label="Buy"
              swappableTokens={swappableTokens}
              token={swappableTokens[2]}
              type="to"
            />
            <SwapButton className='bg-[#EA580C]' disabled />
            <SwapMessage/>
            <SwapToast />
          </Swap>
        )
      }
      return <>
        <Wallet>
          <ConnectWallet>
            <Avatar className="h-6 w-6" />
            <Name />
          </ConnectWallet>
        </Wallet>
      </>;
    }}
  </SwapWrapper>
  </App> */}

## Components

The components are designed to work together hierarchically. For each component, ensure the following:

* `<Swap />` - Set the user's address and error handling.
* `<SwapAmountInput />` - Set the [Token](/onchainkit/token/types#token) to swap and specify the input type (`from` or `to`).
* `<SwapToggleButton />` - Optional component to toggle between input types.
* `<SwapMessage />` - Optional component that displays a message related to the swap operation's current state.
* `<SwapButton />` - Set the onSuccess and onError callbacks.
* `<SwapToast />` - Optional component to notify user of successful swap transaction.

## Props

* [`SwapReact`](/onchainkit/swap/types#swapreact)
* [`SwapDefaultReact`](/onchainkit/swap/types#swapdefaultreact)
* [`SwapAmountInputReact`](/onchainkit/swap/types#swapamountinputreact)
* [`SwapButtonReact`](/onchainkit/swap/types#swapbuttonreact)
* [`SwapMessageReact`](/onchainkit/swap/types#swapmessagereact)
* [`SwapToggleButtonReact`](/onchainkit/swap/types#swaptogglebuttonreact)
* [`SwapToastReact`](/onchainkit/swap/types#swaptoastreactt)



// Follow docs.base.org/builderkits/onchainkit/getting-started
// to install dependencies

import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletAdvancedAddressDetails,
  WalletAdvancedTokenHoldings,
  WalletAdvancedTransactionActions,
  WalletAdvancedWalletActions,
} from '@coinbase/onchainkit/wallet';

function WalletAdvancedDemo() {
  return (
    <Wallet>
      <ConnectWallet />
      <WalletDropdown>
        <WalletAdvancedWalletActions />
        <WalletAdvancedAddressDetails />
        <WalletAdvancedTransactionActions />
        <WalletAdvancedTokenHoldings />
      </WalletDropdown>
    </Wallet>
  )
}
