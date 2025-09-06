"use client";

import { useEffect } from 'react';

/**
 * Simple console override - no database dependencies
 * Just ensures console is silent in production
 */
export function ConsoleLoggerInit() {
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    const originalConsole = (window as unknown as { __originalConsole?: Console }).__originalConsole || console;
    
    if (process.env.NODE_ENV === 'development') {
      originalConsole.log('🛠️ Development mode - console logging active');
    } else {
      // In production, just confirm the override is working
      originalConsole.log('🔇 Production console override active - all logs suppressed');
      
      // Additional safety: override any console methods that might have been missed
      setTimeout(() => {
        console.log = function() { /* silent */ };
        console.error = function() { /* silent */ };
        console.warn = function() { /* silent */ };
        console.info = function() { /* silent */ };
        console.debug = function() { /* silent */ };
      }, 200);
    }
  }, []);

  // This component doesn't render anything
  return null;
}