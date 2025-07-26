import { NextRequest } from 'next/server';
import { addConnection, removeConnection } from '@/lib/paycrest/broadcast';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Server-Sent Events endpoint for real-time payment status updates
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId') || Math.random().toString(36).substring(7);

  console.log('🔌 New SSE connection from client:', clientId);

  // Create SSE response
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      const initialData = {
        type: 'connection',
        message: 'Connected to payment status stream',
        timestamp: new Date().toISOString(),
        clientId
      };
      
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`));

      // Store connection for broadcasting
      const writer = controller;
      addConnection(clientId, writer as unknown as WritableStreamDefaultWriter<Uint8Array>);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log('🔌 SSE client disconnected:', clientId);
        removeConnection(clientId);
        try {
          controller.close();
        } catch (error) {
          console.error('Error closing SSE controller:', error);
        }
      });

      // Send keep-alive messages every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch (error) {
          console.error('Error sending keep-alive:', error);
          clearInterval(keepAlive);
          removeConnection(clientId);
        }
      }, 30000);

      // Clean up interval on close
      const originalClose = controller.close;
      controller.close = () => {
        clearInterval(keepAlive);
        removeConnection(clientId);
        return originalClose.call(controller);
      };
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}