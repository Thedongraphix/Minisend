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
      try {
        // Debug environment variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        const originalConsole = (window as unknown as { __originalConsole?: Console }).__originalConsole || console;
        
        if (!supabaseUrl || !supabaseKey) {
          originalConsole.warn('⚠️ Supabase environment variables missing:', {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseKey,
            urlLength: supabaseUrl?.length || 0,
            keyLength: supabaseKey?.length || 0
          });
          return;
        }
        
        originalConsole.log('✅ Supabase environment variables found - initializing database logger');

        const { initializeConsoleLogger } = await import('@/lib/console-logger');
        const logger = initializeConsoleLogger();
        
        if (process.env.NODE_ENV === 'development') {
          originalConsole.log('✅ Database logger initialized - dev mode: console + database');
          originalConsole.log('📊 Logger stats:', logger.getStats());
        } else {
          // In production, use the original console for this one confirmation
          if ((window as unknown as { __originalConsole?: Console }).__originalConsole) {
            originalConsole.log('🔇 Production console override active - logs stored in database only');
          }
        }
        
      } catch (error) {
        // Use original console for critical initialization errors
        const originalConsole = (window as unknown as { __originalConsole?: Console }).__originalConsole || console;
        originalConsole.error('❌ Failed to initialize database logger:', error);
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