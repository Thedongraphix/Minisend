-- Create system_logs table for storing console output
-- This table will capture all console.log, console.error, console.warn output

CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level TEXT NOT NULL CHECK (level IN ('log', 'error', 'warn', 'info', 'debug')),
    message TEXT NOT NULL,
    data JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    environment TEXT NOT NULL CHECK (environment IN ('development', 'production', 'test')),
    user_agent TEXT,
    url TEXT,
    stack_trace TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON public.system_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs (level);
CREATE INDEX IF NOT EXISTS idx_system_logs_environment ON public.system_logs (environment);
CREATE INDEX IF NOT EXISTS idx_system_logs_level_timestamp ON public.system_logs (level, timestamp DESC);

-- Create index on message for search functionality
CREATE INDEX IF NOT EXISTS idx_system_logs_message_search ON public.system_logs USING gin(to_tsvector('english', message));

-- Add RLS (Row Level Security) policies
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Policy for service role (full access)
CREATE POLICY "Service role full access on system_logs" ON public.system_logs
FOR ALL USING (true) WITH CHECK (true);

-- Policy for authenticated users (read-only access to their own logs if needed)
-- For now, we'll keep it simple and allow service role only
-- You can add more granular policies later if needed

-- Add comments for documentation
COMMENT ON TABLE public.system_logs IS 'Stores all console output from the application for debugging and monitoring';
COMMENT ON COLUMN public.system_logs.level IS 'Log level: log, error, warn, info, debug';
COMMENT ON COLUMN public.system_logs.message IS 'Main log message (sanitized)';
COMMENT ON COLUMN public.system_logs.data IS 'Additional structured data from console arguments';
COMMENT ON COLUMN public.system_logs.environment IS 'Environment where log was generated';
COMMENT ON COLUMN public.system_logs.user_agent IS 'Browser user agent (client-side logs only)';
COMMENT ON COLUMN public.system_logs.url IS 'URL where log was generated (client-side logs only)';
COMMENT ON COLUMN public.system_logs.stack_trace IS 'Stack trace for errors';

-- Create a view for recent logs (useful for monitoring)
CREATE OR REPLACE VIEW public.recent_system_logs AS
SELECT 
    id,
    level,
    message,
    data,
    timestamp,
    environment,
    url,
    CASE 
        WHEN length(stack_trace) > 200 
        THEN left(stack_trace, 200) || '...' 
        ELSE stack_trace 
    END as truncated_stack_trace
FROM public.system_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC
LIMIT 1000;

-- Create a view for error summary (useful for monitoring dashboards)
CREATE OR REPLACE VIEW public.system_log_summary AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    level,
    environment,
    COUNT(*) as log_count,
    COUNT(DISTINCT url) as unique_urls,
    MAX(timestamp) as last_occurrence
FROM public.system_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', timestamp), level, environment
ORDER BY hour DESC, level;

-- Create function to clean old logs (retention policy)
CREATE OR REPLACE FUNCTION public.cleanup_old_system_logs()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Keep logs for 30 days in production, 7 days in development
    DELETE FROM public.system_logs 
    WHERE (
        environment = 'production' AND timestamp < NOW() - INTERVAL '30 days'
    ) OR (
        environment IN ('development', 'test') AND timestamp < NOW() - INTERVAL '7 days'
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO public.system_logs (level, message, environment, timestamp)
    VALUES ('info', 'Cleaned up old system logs: ' || deleted_count || ' records deleted', 'production', NOW());
    
    RETURN deleted_count;
END;
$$;

-- Create function to get log statistics
CREATE OR REPLACE FUNCTION public.get_system_log_stats()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_logs', (SELECT COUNT(*) FROM public.system_logs),
        'logs_last_24h', (SELECT COUNT(*) FROM public.system_logs WHERE timestamp > NOW() - INTERVAL '24 hours'),
        'error_count_24h', (SELECT COUNT(*) FROM public.system_logs WHERE level = 'error' AND timestamp > NOW() - INTERVAL '24 hours'),
        'warn_count_24h', (SELECT COUNT(*) FROM public.system_logs WHERE level = 'warn' AND timestamp > NOW() - INTERVAL '24 hours'),
        'environments', (
            SELECT json_agg(
                json_build_object(
                    'environment', environment,
                    'count', count,
                    'last_log', last_log
                )
            )
            FROM (
                SELECT 
                    environment,
                    COUNT(*) as count,
                    MAX(timestamp) as last_log
                FROM public.system_logs 
                WHERE timestamp > NOW() - INTERVAL '24 hours'
                GROUP BY environment
            ) env_stats
        ),
        'top_errors', (
            SELECT json_agg(
                json_build_object(
                    'message', message,
                    'count', count,
                    'last_occurrence', last_occurrence
                )
            )
            FROM (
                SELECT 
                    message,
                    COUNT(*) as count,
                    MAX(timestamp) as last_occurrence
                FROM public.system_logs 
                WHERE level = 'error' AND timestamp > NOW() - INTERVAL '24 hours'
                GROUP BY message
                ORDER BY count DESC
                LIMIT 10
            ) top_errors
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Grant necessary permissions
GRANT ALL ON public.system_logs TO service_role;
GRANT SELECT ON public.recent_system_logs TO service_role;
GRANT SELECT ON public.system_log_summary TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_system_logs() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_system_log_stats() TO service_role;