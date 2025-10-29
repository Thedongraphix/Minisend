"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useUSDCBalance } from "@/hooks/useUSDCBalance"
import Image from "next/image"

interface CurrencySwapInterfaceProps {
  onContinue: (data: {
    usdcAmount: string
    localAmount: string
    currency: "KES" | "NGN"
    rate: number
  }) => void
  className?: string
}

const CURRENCIES = [
  { code: "KES", name: "Kenyan Shilling", flag: "🇰🇪", symbol: "KSh" },
  { code: "NGN", name: "Nigerian Naira", flag: "🇳🇬", symbol: "₦" },
]

export function CurrencySwapInterface({ onContinue, className = "" }: CurrencySwapInterfaceProps) {
  const { balanceNum: usdcBalance, isLoading: balanceLoading } = useUSDCBalance()

  const [receiveCurrency, setReceiveCurrency] = useState<"KES" | "NGN" | null>(null)
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
      const response = await fetch(`/api/paycrest/rates/USDC/1/${toCurrency}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.rate && typeof data.rate === 'number') {
        setRate(data.rate)
        setRateError(null)
      } else {
        // API responded but with invalid data - use fallback
        const fallbackRate = toCurrency === "KES" ? 150.5 : 1650.0
        setRate(fallbackRate)
        setRateError("Using estimated rate")
      }
    } catch {
      // Network error or parsing error - use fallback
      const fallbackRate = toCurrency === "KES" ? 150.5 : 1650.0
      setRate(fallbackRate)
      setRateError("Using estimated rate")
    } finally {
      setIsLoadingRate(false)
    }
  }, [])

  useEffect(() => {
    if (sendDebounceTimerRef.current) {
      clearTimeout(sendDebounceTimerRef.current)
    }

    sendDebounceTimerRef.current = setTimeout(() => {
      if (sendAmount && rate && focusedInput === "send") {
        const localAmount = Number.parseFloat(sendAmount) * rate
        setReceiveAmount(localAmount.toFixed(2))
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
        const usdcAmount = Number.parseFloat(receiveAmount) / rate
        setSendAmount(usdcAmount.toFixed(6))
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

    onContinue({
      usdcAmount: sendAmount,
      localAmount: receiveAmount,
      currency: receiveCurrency,
      rate,
    })
  }

  const handleMaxClick = () => {
    if (usdcBalance > 0) {
      setSendAmount(usdcBalance.toFixed(6))
      setFocusedInput("send")
      if (rate) {
        setReceiveAmount((usdcBalance * rate).toFixed(2))
      }
    }
  }

  const isValid =
    sendAmount &&
    receiveAmount &&
    receiveCurrency &&
    Number.parseFloat(sendAmount) > 0 &&
    Number.parseFloat(receiveAmount) > 0
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
                <button onClick={handleMaxClick} className="text-[#8e8e93] hover:text-white text-xs transition-colors shrink-0">
                  Balance: {usdcBalance.toFixed(4)}
                </button>
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
                placeholder="0"
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
                placeholder="0"
                className="flex-1 min-w-0 bg-transparent text-white text-3xl font-medium outline-none placeholder-[#48484a]"
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
                            setReceiveCurrency(currency.code as "KES" | "NGN")
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

        {/* Action Button */}
        <button
          onClick={handleContinue}
          disabled={!isValid || hasInsufficientBalance || isLoadingRate}
          className="w-full mt-4 bg-[#5e5ce6] hover:bg-[#7d7aff] disabled:bg-[#3a3a3c] disabled:text-[#8e8e93] text-white font-medium py-4 rounded-xl transition-colors"
        >
          {!receiveCurrency
            ? "Select currency"
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
