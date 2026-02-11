import { Attribution } from "ox/erc8021";
import type { WalletCapabilities } from "@coinbase/onchainkit/transaction";

// Base Builder Code (ERC-8021) for onchain attribution
// Registered at base.dev — attributes transactions to Minisend
const builderCode = process.env.NEXT_PUBLIC_BASE_BUILDER_CODE;

const dataSuffix = builderCode
  ? Attribution.toDataSuffix({ codes: [builderCode] })
  : undefined;

// Capability object to pass to OnchainKit's <Transaction> component
// Extended with dataSuffix for ERC-8021 builder attribution
export const builderCodeCapabilities: WalletCapabilities | undefined = dataSuffix
  ? ({
      dataSuffix: {
        value: dataSuffix,
        optional: true,
      },
    } as WalletCapabilities)
  : undefined;
