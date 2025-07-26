// Store active SSE connections
const connections = new Map<string, WritableStreamDefaultWriter<Uint8Array>>();

/**
 * Broadcast payment status update to all connected clients
 */
export function broadcastPaymentUpdate(orderId: string, status: string, data?: Record<string, unknown>) {
  const encoder = new TextEncoder();
  const eventData = {
    type: 'payment_update',
    orderId,
    status,
    timestamp: new Date().toISOString(),
    data
  };

  const message = `event: payment_update\ndata: ${JSON.stringify(eventData)}\n\n`;
  const encodedMessage = encoder.encode(message);

  console.log(`📡 Broadcasting payment update to ${connections.size} clients:`, {
    orderId,
    status,
    connectedClients: connections.size
  });

  // Send to all connected clients
  const disconnectedClients: string[] = [];
  
  for (const [clientId, writer] of connections.entries()) {
    try {
      // Type assertion needed due to ReadableStream/WritableStream type mismatch
      const controller = writer as unknown as ReadableStreamDefaultController<Uint8Array>;
      controller.enqueue(encodedMessage);
    } catch (error) {
      console.error(`Failed to send update to client ${clientId}:`, error);
      disconnectedClients.push(clientId);
    }
  }

  // Clean up disconnected clients
  disconnectedClients.forEach(clientId => {
    connections.delete(clientId);
  });

  if (disconnectedClients.length > 0) {
    console.log(`🧹 Cleaned up ${disconnectedClients.length} disconnected clients`);
  }
}

/**
 * Broadcast specific payment events
 */
export function broadcastPaymentValidated(orderId: string, data?: Record<string, unknown>) {
  const encoder = new TextEncoder();
  const eventData = {
    orderId,
    status: 'validated',
    message: 'Payment successfully sent to recipient!',
    timestamp: new Date().toISOString(),
    ...data
  };

  const message = `event: payment_validated\ndata: ${JSON.stringify(eventData)}\n\n`;
  const encodedMessage = encoder.encode(message);

  console.log(`🎉 Broadcasting payment validation to ${connections.size} clients:`, orderId);

  for (const [clientId, writer] of connections.entries()) {
    try {
      const controller = writer as unknown as ReadableStreamDefaultController<Uint8Array>;
      controller.enqueue(encodedMessage);
    } catch (error) {
      console.error(`Failed to send validation to client ${clientId}:`, error);
      connections.delete(clientId);
    }
  }
}

export function broadcastPaymentSettled(orderId: string, data?: Record<string, unknown>) {
  const encoder = new TextEncoder();
  const eventData = {
    orderId,
    status: 'settled',
    message: 'Payment fully completed on blockchain',
    timestamp: new Date().toISOString(),
    ...data
  };

  const message = `event: payment_settled\ndata: ${JSON.stringify(eventData)}\n\n`;
  const encodedMessage = encoder.encode(message);

  console.log(`🔗 Broadcasting payment settlement to ${connections.size} clients:`, orderId);

  for (const [clientId, writer] of connections.entries()) {
    try {
      const controller = writer as unknown as ReadableStreamDefaultController<Uint8Array>;
      controller.enqueue(encodedMessage);
    } catch (error) {
      console.error(`Failed to send settlement to client ${clientId}:`, error);
      connections.delete(clientId);
    }
  }
}

/**
 * Register a new SSE connection
 */
export function addConnection(clientId: string, writer: WritableStreamDefaultWriter<Uint8Array>) {
  connections.set(clientId, writer);
  console.log(`📡 Added SSE connection: ${clientId}. Total connections: ${connections.size}`);
}

/**
 * Remove an SSE connection
 */
export function removeConnection(clientId: string) {
  connections.delete(clientId);
  console.log(`📡 Removed SSE connection: ${clientId}. Total connections: ${connections.size}`);
}

/**
 * Get connection count
 */
export function getConnectionCount(): number {
  return connections.size;
}