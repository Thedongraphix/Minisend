# Gasless Transactions on Base using a Paymaster

> Learn how to leverage the Base Paymaster for seamless, gasless transactions on the Coinbase Cloud Developer Platform.

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

Base transaction fees are typically less than a penny, but the concept of gas can still be confusing for new users and lead to poor user experience when users don't have gas funds in their wallet. You can abstract this away and improve your UX by using the **Base Paymaster**. The Paymaster allows you to:

* Batch multi-step transactions
* Create custom gasless experiences
* Sponsor up to \$15k monthly on mainnet (unlimited on testnet)

<Tip>
  If you need an increase in your sponsorship limit, please [reach out on Discord][Discord]!
</Tip>

## Objectives

1. Configure security measures to ensure safe and reliable transactions.
2. Manage and allocate resources for sponsored transactions.
3. Subsidize transaction fees for users, enhancing the user experience by making transactions free.
4. Set up and manage sponsored transactions on various schedules, including weekly, monthly, and daily cadences.

## Prerequisites

This tutorial assumes you have:

1. **A Coinbase Cloud Developer Platform Account**\
   If not, sign up on the [CDP site]. Once you have your account, you can manage projects and utilize tools like the Paymaster.

2. **Familiarity with Smart Accounts and ERC 4337**\
   Smart Accounts are the backbone of advanced transaction patterns (e.g., bundling, sponsorship). If you’re new to ERC 4337, check out external resources like the official [EIP-4337 explainer](https://eips.ethereum.org/EIPS/eip-4337) before starting.

3. **Foundry**\
   Foundry is a development environment, testing framework, and smart contract toolkit for Ethereum. You’ll need it installed locally for generating key pairs and interacting with smart contracts.

<Tip>
  **Testnet vs. Mainnet**\
  If you prefer not to spend real funds, you can switch to **Base Sepolia** (testnet). The steps below are conceptually the same. Just select *Base Sepolia* in the Coinbase Developer Platform instead of *Base Mainnet*, and use a contract deployed on Base testnet for your allowlisted methods.
</Tip>

## Set Up a Base Paymaster & Bundler

In this section, you will configure a Paymaster to sponsor payments on behalf of a specific smart contract for a specified amount.

1. **Navigate to the [Coinbase Developer Platform].**
2. Create or select your project from the upper left corner of the screen.
3. Click on the **Paymaster** tool from the left navigation.
4. Go to the **Configuration** tab and copy the **RPC URL** to your clipboard — you’ll need this shortly in your code.

### Screenshots

* **Selecting your project**

<Frame>
    <img src="https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-select-project.png?fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=ad65ae145f038beb29b5b0538d8d20bc" alt="cdp-home.png" data-og-width="6014" width="6014" data-og-height="3204" height="3204" data-path="images/gasless-transaction-on-base/cdp-select-project.png" srcset="https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-select-project.png?w=280&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=7a8f5d3b06d5861dfef74192d778b775 280w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-select-project.png?w=560&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=681610a22ee1007deb916e37004c500b 560w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-select-project.png?w=840&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=cc04837c138a751a7ebacd58ec4a3f5a 840w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-select-project.png?w=1100&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=bd5806283fd32cd98d70a4e8e8496d58 1100w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-select-project.png?w=1650&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=537c2774026158639f6cadf5f0dcca9c 1650w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-select-project.png?w=2500&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=97f0f630239daf93bd526ba909c9a481 2500w" data-optimize="true" data-opv="2" />
</Frame>

* **Navigating to the Paymaster tool**

<Frame>
    <img src="https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-paymaster.png?fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=7b6293dfe4563c17be199da2350f5826" alt="cdp-paymaster-tool.png" data-og-width="6014" width="6014" data-og-height="3204" height="3204" data-path="images/gasless-transaction-on-base/cdp-paymaster.png" srcset="https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-paymaster.png?w=280&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=cac92d4f7fe409f4c5f7970fa0117cca 280w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-paymaster.png?w=560&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=1505d2b360b99478f413432a9f90af0f 560w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-paymaster.png?w=840&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=fcd7e32691c63edd4f0bde8657653218 840w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-paymaster.png?w=1100&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=deb1f6f323e7dabc8b9409a61d0722a4 1100w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-paymaster.png?w=1650&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=f995f280364e48bc1727bac9e1045461 1650w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-paymaster.png?w=2500&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=95ddb09e7de4117a061b05a0dda17358 2500w" data-optimize="true" data-opv="2" />
</Frame>

* **Configuration screen**

<Frame>
    <img src="https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-config.png?fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=729f5128cf98287e52874446b44417e8" alt="cdp-paymaster-tool.png" data-og-width="6014" width="6014" data-og-height="3204" height="3204" data-path="images/gasless-transaction-on-base/cdp-config.png" srcset="https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-config.png?w=280&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=0250be7f905d6bf3835dc2b8661ea4d0 280w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-config.png?w=560&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=84666ff9f69c5e09473d9de38013c0ec 560w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-config.png?w=840&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=d80ec5b828bf01c5f9d3e0f7e36a1d09 840w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-config.png?w=1100&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=286e77cf9b53b0c4f8d07334ddadc5eb 1100w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-config.png?w=1650&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=97394c5c2a5551891d1d9f22aa611127 1650w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-config.png?w=2500&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=21a0e41f41e9592f176ab60a0629982a 2500w" data-optimize="true" data-opv="2" />
</Frame>

### Allowlist a Sponsorable Contract

1. From the Configuration page, ensure **Base Mainnet** (or **Base Sepolia** if you’re testing) is selected.
2. Enable your paymaster by clicking the toggle button.
3. Click **Add** to add an allowlisted contract.
4. For this example, add [`0x83bd615eb93eE1336acA53e185b03B54fF4A17e8`][simple NFT contract], and add the function `mintTo(address)`.

<Frame>
    <img src="https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-allowlist-contract.png?fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=c22391f42bb9b10e11d38fc68318469d" alt="cdp-allowlist-contracts.png" data-og-width="6014" width="6014" data-og-height="3204" height="3204" data-path="images/gasless-transaction-on-base/cdp-allowlist-contract.png" srcset="https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-allowlist-contract.png?w=280&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=7cb5144b2256eb7f5f6030cd68e92b84 280w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-allowlist-contract.png?w=560&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=28e3e63f66f06046e63050f56a30c923 560w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-allowlist-contract.png?w=840&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=a3bca93cf31273fde628dc4684544092 840w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-allowlist-contract.png?w=1100&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=c852a17ff2bfbbf999db359d1ab80aa8 1100w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-allowlist-contract.png?w=1650&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=9cb801e53fb33bb1375a6bb66474070f 1650w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-allowlist-contract.png?w=2500&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=c4b30fb14aa038fe449c907499bd3915 2500w" data-optimize="true" data-opv="2" />
</Frame>

<Note>
  **Use your own contract**\
  We use a [simple NFT contract][simple NFT contract] on Base mainnet as an example. Feel free to substitute your own.
</Note>

### Global & Per User Limits

Scroll down to the **Per User Limit** section. You can set:

* **Dollar amount limit** or **number of UserOperations** per user
* **Limit cycles** that reset daily, weekly, or monthly

For example, you might set:

* `max USD` to `$0.05`
* `max UserOperation` to `1`

This means **each user** can only have \$0.05 in sponsored gas and **1** user operation before the cycle resets.

<Note>
  **Limit Cycles**\
  These reset based on the selected cadence (daily, weekly, monthly).
</Note>

Next, **set the Global Limit**. For example, set this to `$0.07` so that once the entire paymaster has sponsored \$0.07 worth of gas (across all users), no more sponsorship occurs unless you raise the limit.

<Frame>
    <img src="https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-global-user-limits.png?fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=2807bf6b44d653a07048688480048fcf" alt="cdp-global-user-limits.png" data-og-width="6014" width="6014" data-og-height="3204" height="3204" data-path="images/gasless-transaction-on-base/cdp-global-user-limits.png" srcset="https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-global-user-limits.png?w=280&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=96fe3b6383c52bcbb396228279210dfe 280w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-global-user-limits.png?w=560&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=1a2b5ca1edacc5dcea30e809ead8d277 560w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-global-user-limits.png?w=840&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=c98ee9efb46a3463f676a9289d3b7dd4 840w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-global-user-limits.png?w=1100&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=9e93d95fcf06a63cfd613be3f14903c0 1100w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-global-user-limits.png?w=1650&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=ee781939cd800ed0b3fa4a32643eb97e 1650w, https://mintcdn.com/base-a060aa97/yhxBW4teesnxVVBa/images/gasless-transaction-on-base/cdp-global-user-limits.png?w=2500&fit=max&auto=format&n=yhxBW4teesnxVVBa&q=85&s=2702731d3f5bf2834ddccd0fd7f947c0 2500w" data-optimize="true" data-opv="2" />
</Frame>

## Test Your Paymaster Policy

Now let’s verify that these policies work. We’ll:

1. Create two local key pairs (or use private keys you own).
2. Generate two Smart Accounts.
3. Attempt to sponsor multiple transactions to see your policy in action.

### Installing Foundry

1. Ensure you have **Rust** installed
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
2. Install Foundry
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```
3. Verify it works
   ```bash
   cast --help
   ```
   If you see Foundry usage info, you’re good to go!

### Create Your Project & Generate Key Pairs

1. Make a new folder and install dependencies, `viem` and `permissionless`:
   ```bash
   mkdir sponsored_transactions
   cd sponsored_transactions
   npm init es6
   npm install permissionless
   npm install viem
   touch index.js
   ```
2. Generate two key pairs with Foundry:
   ```bash
   cast wallet new
   cast wallet new
   ```
   You’ll see something like:
   ```bash
   Successfully created new keypair.
   Address: 0xD440D746...
   Private key: 0x01c9720c1dfa3c9...
   ```
   **Store these private keys somewhere safe**

### Project Structure With Environment Variables

Create a `.env` file in the `sponsored_transactions` directory. In the `.env`, you'll add the rpcURL for your paymaster and the private keys for your accounts:

<Info>
  **Find your Paymaster & Bundler endpoint**

  The Paymaster & Bundler endpoint is the URL for your Coinbase Developer Platform (CDP) Paymaster.
  This was saved in the previous section and follows this format: `https://api.developer.coinbase.com/rpc/v1/base/<SPECIAL-KEY>`
  Navigate to the [Paymaster Tool] and select the `Configuration` tab at the top of the screen to obtain your RPC URL.
</Info>

<Danger>
  **Secure your endpoints**

  You will create a constant for our Paymaster & Bundler endpoint obtained from cdp.portal.coinbase.com. The most secure way to do this is by using a proxy. For the purposes of this demo, hardcode it into our `index.js` file. For product, we highly recommend using a [proxy service].
</Danger>

```bash
PAYMASTER_RPC_URL=https://api.developer.coinbase.com/rpc/v1/base/<SPECIAL-KEY>
PRIVATE_KEY_1=0x01c9720c1dfa3c9...
PRIVATE_KEY_2=0xbcd6fbc1dfa3c9...
```

<Danger>
  Never commit `.env` files to a public repo!
</Danger>

## Example `index.js`

Below is a full example of how you might structure `index.js`.

```js index.js
// --- index.js ---
// @noErrors

// 1. Import modules and environment variables
import 'dotenv/config';
import { http, createPublicClient, encodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import { createSmartAccountClient } from 'permissionless';
import { privateKeyToSimpleSmartAccount } from 'permissionless/accounts';
import { createPimlicoPaymasterClient } from 'permissionless/clients/pimlico';

// 2. Retrieve secrets from .env
// Highlight: environment variables for paymaster, private keys
const rpcUrl = process.env.PAYMASTER_RPC_URL; // highlight
const firstPrivateKey = process.env.PRIVATE_KEY_1; // highlight
const secondPrivateKey = process.env.PRIVATE_KEY_2; // highlight

// 3. Declare Base addresses (entrypoint & factory)
const baseEntryPoint = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
const baseFactoryAddress = '0x15Ba39375ee2Ab563E8873C8390be6f2E2F50232';

// 4. Create a public client for Base
const publicClient = createPublicClient({
  chain: base,
  transport: http(rpcUrl),
});

// 5. Setup Paymaster client
const cloudPaymaster = createPimlicoPaymasterClient({
  chain: base,
  transport: http(rpcUrl),
  entryPoint: baseEntryPoint,
});

// 6. Create Smart Accounts from the private keys
async function initSmartAccounts() {
  const simpleAccount = await privateKeyToSimpleSmartAccount(publicClient, {
    privateKey: firstPrivateKey,
    factoryAddress: baseFactoryAddress,
    entryPoint: baseEntryPoint,
  });

  const simpleAccount2 = await privateKeyToSimpleSmartAccount(publicClient, {
    privateKey: secondPrivateKey,
    factoryAddress: baseFactoryAddress,
    entryPoint: baseEntryPoint,
  });

  // 7. Create SmartAccountClient for each
  const smartAccountClient = createSmartAccountClient({
    account: simpleAccount,
    chain: base,
    bundlerTransport: http(rpcUrl),
    middleware: {
      sponsorUserOperation: cloudPaymaster.sponsorUserOperation,
    },
  });

  const smartAccountClient2 = createSmartAccountClient({
    account: simpleAccount2,
    chain: base,
    bundlerTransport: http(rpcUrl),
    middleware: {
      sponsorUserOperation: cloudPaymaster.sponsorUserOperation,
    },
  });

  return { smartAccountClient, smartAccountClient2 };
}

// 8. ABI for the NFT contract
const nftAbi = [
  // ...
  // truncated for brevity
];

// 9. Example function to send a transaction from a given SmartAccountClient
async function sendTransaction(client, recipientAddress) {
  try {
    // encode the "mintTo" function call
    const callData = encodeFunctionData({
      abi: nftAbi,
      functionName: 'mintTo',
      args: [recipientAddress], // highlight: specify who gets the minted NFT
    });

    const txHash = await client.sendTransaction({
      account: client.account,
      to: '0x83bd615eb93eE1336acA53e185b03B54fF4A17e8', // address of the NFT contract
      data: callData,
      value: 0n,
    });

    console.log(`✅ Transaction successfully sponsored for ${client.account.address}`);
    console.log(`🔍 View on BaseScan: https://basescan.org/tx/${txHash}`);
  } catch (error) {
    console.error('Transaction failed:', error);
  }
}

// 10. Main flow: init accounts, send transactions
(async () => {
  const { smartAccountClient, smartAccountClient2 } = await initSmartAccounts();

  // Send a transaction from the first account
  await sendTransaction(smartAccountClient, smartAccountClient.account.address);

  // Send a transaction from the second account
  // For variety, let’s also mint to the second account's own address
  await sendTransaction(smartAccountClient2, smartAccountClient2.account.address);
})();
```

Now that the code is implemented, lets run it:
Run this via `node index.js` from your project root.

```bash
node index.js
```

You should see a "Transaction successfully sponsored" output.

To confirm that your spend policies are correctly in place, try running the script again. If your Paymaster settings are strict (e.g., limit 1 transaction per user), the second time you run the script, you may get a “request denied” error, indicating the policy is working.

## Hitting Policy Limits & Troubleshooting

1. **Per-User Limit**\
   If you see an error like:

   ```json
   {
     "code": -32001,
     "message": "request denied - rejected due to maximum per address transaction count reached"
   }
   ```

   That means you’ve hit your **UserOperation** limit for a single account. Return to the [Coinbase Developer Platform] UI to adjust the policy.

2. **Global Limit**\
   If you repeatedly run transactions and eventually see:
   ```json
   {
     "code": -32001,
     "message": "request denied - rejected due to max global usd Spend Permission reached"
   }
   ```
   You’ve hit the **global** limit of sponsored gas. Increase it in the CDP dashboard and wait a few minutes for changes to take effect.

## Verifying Token Ownership (Optional)

Want to confirm the token actually minted? You can read the NFT’s `balanceOf` function:

```js
import { readContract } from 'viem'; // highlight

// example function
async function checkNftBalance(publicClient, contractAddress, abi, ownerAddress) {
  const balance = await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: 'balanceOf',
    args: [ownerAddress],
  });
  console.log(`NFT balance of ${ownerAddress} is now: ${balance}`);
}
```

## Conclusion

In this tutorial, you:

* Set up and **configured** a Base Paymaster on the Coinbase Developer Platform.
* **Allowlisted** a contract and specific function (`mintTo`) for sponsorship.
* Established **per-user** and **global** sponsorship **limits** to control costs.
* Demonstrated the **sponsorship flow** with Smart Accounts using `permissionless`, `viem`, and Foundry-generated private keys.

This approach can greatly improve your dApp’s user experience by removing gas friction. For more complex sponsorship schemes (like daily or weekly cycles), simply tweak your per-user and global limit settings in the Coinbase Developer Platform.

> **Next Steps**
>
> * Use a [proxy service][proxy service] for better endpoint security.
> * Deploy your own contracts and allowlist them.
> * Experiment with bundling multiple calls into a single sponsored transaction.

## References

* [list of factory addresses]
* [Discord]
* [CDP site]
* [Coinbase Developer Platform]
* [UI]
* [proxy service]
* [Paymaster Tool]
* [Foundry Book installation guide]
* [simple NFT contract]

[list of factory addresses]: https://docs.alchemy.com/reference/factory-addresses

[Discord]: https://discord.com/invite/buildonbase

[CDP site]: https://portal.cdp.coinbase.com/

[Coinbase Developer Platform]: https://portal.cdp.coinbase.com/

[UI]: https://portal.cdp.coinbase.com/products/bundler-and-paymaster

[proxy service]: https://www.smartwallet.dev/guides/paymasters

[Paymaster Tool]: https://portal.cdp.coinbase.com/products/bundler-and-paymaster

[Foundry Book installation guide]: https://book.getfoundry.sh/getting-started/installation

[simple NFT contract]: https://basescan.org/token/0x83bd615eb93ee1336aca53e185b03b54ff4a17e8

**Happy Building on Base!**
