"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useUSDCBalance } from "@/hooks/useUSDCBalance"
import { useAccount } from "wagmi"
import Image from "next/image"

interface CurrencySwapInterfaceProps {
  onContinue: (data: {
    usdcAmount: string
    localAmount: string
    currency: "KES" | "NGN" | "GHS"
    rate: number
  }) => void
  className?: string
}

const CURRENCIES = [
  { code: "KES", name: "Kenyan Shilling", flag: "🇰🇪", symbol: "KSh" },
  { code: "NGN", name: "Nigerian Naira", flag: "🇳🇬", symbol: "₦" },
  { code: "GHS", name: "Ghanaian Cedi", flag: "🇬🇭", symbol: "₵" },
]

export function CurrencySwapInterface({ onContinue, className = "" }: CurrencySwapInterfaceProps) {
  const { balanceNum: usdcBalance, isLoading: balanceLoading } = useUSDCBalance()
  const { address } = useAccount()

  const [receiveCurrency, setReceiveCurrency] = useState<"KES" | "NGN" | "GHS" | null>(null)
  const [sendAmount, setSendAmount] = useState("")
  const [receiveAmount, setReceiveAmount] = useState("")
  const [rate, setRate] = useState<number | null>(null)
  const [isLoadingRate, setIsLoadingRate] = useState(false)
  const [rateError, setRateError] = useState<string | null>(null)
  const [focusedInput, setFocusedInput] = useState<"send" | "receive" | null>(null)
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false)

  const sendDebounceTimerRef = useRef<NodeJS.Timeout>()
  const receiveDebounceTimerRef = useRef<NodeJS.Timeout>()

  const selectedCurrency = receiveCurrency ? CURRENCIES.find((c) => c.code === receiveCurrency) : null

  const fetchRate = useCallback(async (toCurrency: string) => {
    setIsLoadingRate(true)
    setRateError(null)

    try {
      let endpoint: string;

      // Use PayCrest for NGN, Pretium for KES and GHS
      if (toCurrency === 'NGN') {
        endpoint = `/api/paycrest/rates/USDC/1/${toCurrency}?network=base`;
        console.log('[NGN Rate] Fetching from PayCrest:', endpoint);
      } else {
        endpoint = `/api/pretium/rates?currency=${toCurrency}`;
        console.log('[Rate] Fetching from Pretium:', endpoint);
      }

      const response = await fetch(endpoint)
      console.log('[Rate] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('[Rate] Response data:', data);

      let fetchedRate: number | null = null;

      if (toCurrency === 'NGN') {
        // Handle PayCrest response format: { success: true, rate: 1650.50 }
        console.log('[NGN Rate] Parsing PayCrest response:', { success: data.success, rate: data.rate });
        if (data.success && data.rate) {
          fetchedRate = typeof data.rate === 'number' ? data.rate : parseFloat(data.rate);
          console.log('[NGN Rate] Parsed rate:', fetchedRate);
        } else {
          console.error('[NGN Rate] Failed to parse - missing success or rate field');
        }
      } else {
        // Handle Pretium response format
        if (data.success && data.rates?.quoted_rate) {
          fetchedRate = data.rates.quoted_rate;
        }
      }

      if (fetchedRate && typeof fetchedRate === 'number') {
        console.log('[Rate] Setting rate:', fetchedRate);
        setRate(fetchedRate)
        setRateError(null)
      } else {
        // API responded but with invalid data - use fallback
        console.warn('[Rate] Invalid rate data, using fallback');
        const fallbackRate = toCurrency === "KES" ? 150.5 : toCurrency === "GHS" ? 16.5 : 1650.0
        setRate(fallbackRate)
        setRateError("Using estimated rate")
      }
    } catch (error) {
      // Network error or parsing error - use fallback
      console.error('[Rate] Error fetching rate:', error);
      const fallbackRate = toCurrency === "KES" ? 150.5 : toCurrency === "GHS" ? 16.5 : 1650.0
      setRate(fallbackRate)
      setRateError("Using estimated rate")
    } finally {
      setIsLoadingRate(false)
    }
  }, [address])

  useEffect(() => {
    if (sendDebounceTimerRef.current) {
      clearTimeout(sendDebounceTimerRef.current)
    }

    sendDebounceTimerRef.current = setTimeout(() => {
      if (sendAmount && rate && focusedInput === "send") {
        // User entered USDC amount
        // Calculate total KES, then what recipient gets after 1% fee
        const totalKES = Number.parseFloat(sendAmount) * rate
        const recipientAmount = Math.round(totalKES / 1.01)
        setReceiveAmount(recipientAmount.toFixed(2))
      }
    }, 100) // Reduced debounce for faster response

    return () => {
      if (sendDebounceTimerRef.current) {
        clearTimeout(sendDebounceTimerRef.current)
      }
    }
  }, [sendAmount, rate, focusedInput])

  useEffect(() => {
    if (receiveDebounceTimerRef.current) {
      clearTimeout(receiveDebounceTimerRef.current)
    }

    receiveDebounceTimerRef.current = setTimeout(() => {
      if (receiveAmount && rate && focusedInput === "receive") {
        // User entered amount they want to RECEIVE
        // We need to send enough that after 1% fee, they get this amount
        // Formula: totalKES = recipientAmount * 1.01
        const recipientAmount = Number.parseFloat(receiveAmount)
        const totalKESNeeded = recipientAmount * 1.01
        const usdcAmount = totalKESNeeded / rate
        setSendAmount(usdcAmount.toFixed(2))
      }
    }, 100) // Reduced debounce for faster response

    return () => {
      if (receiveDebounceTimerRef.current) {
        clearTimeout(receiveDebounceTimerRef.current)
      }
    }
  }, [receiveAmount, rate, focusedInput])

  useEffect(() => {
    if (receiveCurrency) {
      // Reset rate when currency changes
      setRate(null)
      setRateError(null)
      // Fetch new rate
      fetchRate(receiveCurrency)
    }
  }, [receiveCurrency, fetchRate])

  const handleContinue = () => {
    if (!sendAmount || !receiveAmount || !rate || !receiveCurrency) return

    // Round USDC to 2 decimal places to avoid rate mismatch with Pretium
    const normalizedUSDC = (Math.round(parseFloat(sendAmount) * 100) / 100).toFixed(2)

    onContinue({
      usdcAmount: normalizedUSDC,
      localAmount: receiveAmount,
      currency: receiveCurrency,
      rate,
    })
  }

  const handleMaxClick = () => {
    if (usdcBalance > 0) {
      // User can send entire balance
      const roundedMax = Math.round(usdcBalance * 100) / 100

      setSendAmount(roundedMax.toFixed(2))
      setFocusedInput("send")
      if (rate) {
        // Calculate what they'll receive after 1% fee
        const totalKES = roundedMax * rate
        const recipientAmount = Math.round(totalKES / 1.01)
        setReceiveAmount(recipientAmount.toFixed(2))
      }
    }
  }

  // Minimum amounts per currency (PayCrest requirements)
  const minimumAmounts = {
    'KES': 0.5,
    'NGN': 1.0,
    'GHS': 0.5,
  };

  const minAmount = receiveCurrency ? minimumAmounts[receiveCurrency] : 0;
  const isBelowMinimum = receiveCurrency && Number.parseFloat(sendAmount) > 0 && Number.parseFloat(sendAmount) < minAmount;

  const isValid =
    sendAmount &&
    receiveAmount &&
    receiveCurrency &&
    Number.parseFloat(sendAmount) > 0 &&
    Number.parseFloat(receiveAmount) > 0 &&
    !isBelowMinimum
  const hasInsufficientBalance = Number.parseFloat(sendAmount) > usdcBalance

  return (
    <div className={`w-full max-w-[460px] mx-auto ${className}`}>
      <div className="bg-[#1c1c1e] rounded-2xl p-4 relative">
        {/* Header */}
        <div className="mb-3">
          <h3 className="text-white text-lg font-medium">Swap</h3>
        </div>

        <div className="space-y-1 w-full">
          {/* Send Section */}
          <div className="bg-[#2c2c2e] rounded-xl p-4 w-full">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[#8e8e93] text-sm">Send</span>
              {!balanceLoading && usdcBalance > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[#8e8e93] text-xs">Balance: {usdcBalance.toFixed(4)}</span>
                  <button
                    onClick={handleMaxClick}
                    className="px-2 py-1 bg-[#5e5ce6] hover:bg-[#7d7aff] text-white text-xs font-medium rounded-md transition-colors"
                  >
                    MAX
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 w-full">
              <input
                type="text"
                inputMode="decimal"
                value={sendAmount}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setSendAmount(value)
                    setFocusedInput("send")
                  }
                }}
                onFocus={() => setFocusedInput("send")}
                placeholder="0.00"
                className="flex-1 min-w-0 bg-transparent text-white text-3xl font-medium outline-none placeholder-[#48484a]"
              />

              <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#3a3a3c] hover:bg-[#48484a] transition-colors shrink-0">
                <Image
                  src="/usdc.svg"
                  alt="USDC"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <span className="text-white font-medium">USDC</span>
                <svg className="w-4 h-4 text-[#8e8e93]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {hasInsufficientBalance && <div className="mt-2 text-[#ff453a] text-xs">Insufficient balance</div>}
            {isBelowMinimum && <div className="mt-2 text-amber-400 text-xs">Minimum ${minAmount} USDC required for {receiveCurrency}</div>}
          </div>

          {/* Swap Arrow */}
          <div className="flex justify-center -my-2 relative z-10">
            <div className="bg-[#1c1c1e] p-2">
              <div className="w-10 h-10 rounded-lg bg-[#2c2c2e] border border-[#3a3a3c] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#8e8e93]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>
          </div>

          {/* Receive Section */}
          <div className="bg-[#2c2c2e] rounded-xl p-4 w-full">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[#8e8e93] text-sm">Receive</span>
              <div className="flex flex-col items-end shrink-0">
                {isLoadingRate && (
                  <span className="text-[#8e8e93] text-xs">Loading rate...</span>
                )}
                {!isLoadingRate && rate && selectedCurrency && (
                  <>
                    <span className="text-[#8e8e93] text-xs">
                      1 USDC = {rate.toFixed(2)} {selectedCurrency.code}
                    </span>
                    {rateError && (
                      <span className="text-amber-400 text-[10px] mt-0.5">{rateError}</span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full">
              <input
                type="text"
                inputMode="decimal"
                value={receiveAmount}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                    setReceiveAmount(value)
                    setFocusedInput("receive")
                  }
                }}
                onFocus={() => setFocusedInput("receive")}
                placeholder={selectedCurrency ? "0.00" : "0"}
                className="flex-1 min-w-0 bg-transparent text-white text-3xl font-medium outline-none placeholder-[#48484a] placeholder:text-2xl"
              />

              <div className="relative shrink-0">
                <button
                  onClick={() => setShowCurrencyMenu(!showCurrencyMenu)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5e5ce6] hover:bg-[#7d7aff] transition-colors whitespace-nowrap"
                >
                  {selectedCurrency ? (
                    <>
                      <span className="text-xl">{selectedCurrency.flag}</span>
                      <span className="text-white font-medium">{selectedCurrency.code}</span>
                    </>
                  ) : (
                    <span className="text-white font-medium">Select currency</span>
                  )}
                  <svg
                    className={`w-4 h-4 text-white transition-transform ${showCurrencyMenu ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showCurrencyMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCurrencyMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-[#2c2c2e] border border-[#3a3a3c] rounded-xl overflow-hidden z-50 shadow-xl">
                      {CURRENCIES.map((currency) => (
                        <button
                          key={currency.code}
                          onClick={() => {
                            setReceiveCurrency(currency.code as "KES" | "NGN" | "GHS")
                            setShowCurrencyMenu(false)
                            setSendAmount("")
                            setReceiveAmount("")
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#3a3a3c] transition-colors"
                        >
                          <span className="text-xl">{currency.flag}</span>
                          <div className="flex-1 text-left">
                            <div className="text-white font-medium text-sm">{currency.code}</div>
                            <div className="text-[#8e8e93] text-xs">{currency.name}</div>
                          </div>
                          {receiveCurrency === currency.code && (
                            <svg className="w-5 h-5 text-[#5e5ce6]" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {isLoadingRate && <div className="mt-2 text-[#8e8e93] text-xs">Fetching rate...</div>}
          </div>
        </div>

        {/* Helper Text */}
        {selectedCurrency && (
          <div className="flex items-center justify-center gap-2 mt-3 text-[#8e8e93] text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Tip: You can enter amount in either USDC or {selectedCurrency.code}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleContinue}
          disabled={!isValid || hasInsufficientBalance || isLoadingRate}
          className="w-full mt-4 bg-[#5e5ce6] hover:bg-[#7d7aff] disabled:bg-[#3a3a3c] disabled:text-[#8e8e93] text-white font-medium py-4 rounded-xl transition-colors"
        >
          {!receiveCurrency
            ? "Select currency"
            : isBelowMinimum
              ? `Minimum $${minAmount} USDC`
              : !isValid
                ? "Enter amount"
                : hasInsufficientBalance
                  ? "Insufficient balance"
                  : "Swap"}
        </button>
      </div>
    </div>
  )
}
