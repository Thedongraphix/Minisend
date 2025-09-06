"use client";

import { useEffect } from 'react';

/**
 * Client-side component to initialize console logging
 * This runs immediately when the app loads to capture all console output
 */
export function ConsoleLoggerInit() {
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    // Dynamically import and initialize the console logger
    const initializeLogger = async () => {
      try {
        const { initializeConsoleLogger } = await import('@/lib/console-logger');
        const logger = initializeConsoleLogger();
        
        // Log successful initialization (this will be captured by the logger)
        console.log('✅ Console logger initialized successfully');
        console.log('📊 Logger stats:', logger.getStats());
        
        // Test logging with different levels
        console.info('🔧 Console override active - all logs will be stored in Supabase');
        
        if (process.env.NODE_ENV === 'development') {
          console.debug('🛠️ Development mode: logs go to both console and database');
        } else {
          console.info('🚀 Production mode: logs go only to database (silent console)');
        }
        
      } catch (error) {
        // Use original console for this error since logger failed to initialize
        const originalError = console.error.bind(console);
        originalError('❌ Failed to initialize console logger:', error);
      }
    };

    // Initialize immediately
    initializeLogger();

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