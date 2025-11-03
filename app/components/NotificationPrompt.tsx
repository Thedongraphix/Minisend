"use client";

import { useState, useCallback } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { Button, Icon } from "./BaseComponents";

interface NotificationPromptProps {
  className?: string;
}

/**
 * NotificationPrompt Component
 *
 * Allows users to add the Mini App and enable notifications.
 * Uses the addMiniApp() method from @farcaster/miniapp-sdk to trigger
 * the notification enrollment flow.
 */
export function NotificationPrompt({ className = "" }: NotificationPromptProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleAddMiniApp = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await sdk.actions.addMiniApp();

      if (response.notificationDetails) {
        setStatus("success");
      } else {
        setStatus("success");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to enable notifications");
    }
  }, []);

  if (status === "success") {
    return (
      <div className={`bg-green-900/30 border border-green-500/50 rounded-xl p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <Icon name="check" size="md" className="text-green-400 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-green-400">Notifications Enabled!</h3>
            <p className="text-xs text-gray-300 mt-1">
              You&apos;ll receive updates about your transactions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <Icon name="bell" size="md" className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white mb-1">
            Stay Updated
          </h3>
          <p className="text-xs text-gray-300 mb-3">
            Enable notifications to get real-time updates on your transactions.
          </p>

          <Button
            variant="primary"
            size="small"
            onClick={handleAddMiniApp}
            disabled={status === "loading"}
            className="w-full"
          >
            {status === "loading" ? "Enabling..." : "Enable Notifications"}
          </Button>

          {status === "error" && errorMessage && (
            <div className="mt-2 text-xs text-red-400">
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact notification toggle for header/navigation
 */
export function NotificationToggle({ className = "" }: NotificationPromptProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleToggle = useCallback(async () => {
    if (status === "success") return;

    setStatus("loading");

    try {
      await sdk.actions.addMiniApp();
      setStatus("success");
    } catch {
      setStatus("idle");
    }
  }, [status]);

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
        status === "success"
          ? "bg-green-500/20 border border-green-500/50"
          : "bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30"
      } ${className}`}
      title={status === "success" ? "Notifications enabled" : "Enable notifications"}
      disabled={status === "loading"}
    >
      {status === "loading" ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : status === "success" ? (
        <Icon name="check" size="sm" className="text-green-400" />
      ) : (
        <Icon name="bell" size="sm" className="text-gray-300" />
      )}
    </button>
  );
}
