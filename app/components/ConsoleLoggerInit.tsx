"use client";

import { useEffect } from 'react';

/**
 * Client-side component to initialize database logging
 * The immediate console override is already active from layout.tsx
 */
export function ConsoleLoggerInit() {
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    // Initialize database logging system
    const initializeDatabaseLogger = async () => {
      const originalConsole = (window as unknown as { __originalConsole?: Console }).__originalConsole || console;
      
      try {
        // Simple check - just try to initialize the logger
        const { initializeConsoleLogger } = await import('@/lib/console-logger');
        const logger = initializeConsoleLogger();
        
        if (process.env.NODE_ENV === 'development') {
          originalConsole.log('✅ Console logger initialized - dev mode: console + database');
          originalConsole.log('📊 Logger stats:', logger.getStats());
        } else {
          originalConsole.log('🔇 Production console override active - logs stored in database');
        }
        
      } catch (error) {
        // Just log the error and continue - console override is still active
        originalConsole.error('❌ Failed to initialize database logger:', error);
        originalConsole.log('🔇 Console override remains active - logs will be silent in production');
      }
    };

    // Small delay to ensure the immediate override has taken effect
    setTimeout(initializeDatabaseLogger, 100);

    // Cleanup function to flush logs on unmount
    return () => {
      import('@/lib/console-logger')
        .then(({ getConsoleLogger }) => {
          const logger = getConsoleLogger();
          if (logger) {
            logger.flushLogs();
          }
        })
        .catch(() => {
          // Ignore cleanup errors
        });
    };
  }, []);

  // This component doesn't render anything
  return null;
}