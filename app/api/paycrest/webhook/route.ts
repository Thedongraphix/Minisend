import { NextRequest, NextResponse } from 'next/server';
import { getPaycrestService } from '@/lib/paycrest/config';
import { PaycrestWebhookEvent, PaycrestOrder } from '@/lib/paycrest';

export async function POST(request: NextRequest) {
  try {
    // Get the signature from headers
    const signature = request.headers.get('x-paycrest-signature');
    
    if (!signature) {
      console.error('PayCrest webhook: Missing signature header');
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 401 }
      );
    }

    // Get the raw body for signature verification
    const rawBody = await request.text();
    
    // Verify webhook signature
    const paycrestService = await getPaycrestService();
    const isValid = paycrestService.verifyWebhookSignature(rawBody, signature);
    
    if (!isValid) {
      console.error('PayCrest webhook: Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    let webhookEvent: PaycrestWebhookEvent;
    try {
      webhookEvent = JSON.parse(rawBody);
    } catch (error) {
      console.error('PayCrest webhook: Invalid JSON payload', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const { event, data: order } = webhookEvent;
    
    console.log(`PayCrest webhook received: ${event} for order ${order.id}`, {
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      token: order.token,
      network: order.network,
      reference: order.reference,
      recipient: order.recipient
    });

    // Handle different order status events
    switch (order.status) {
      case 'pending':
        console.log(`Order ${order.id} is pending provider assignment`);
        await handleOrderPending(order);
        break;
        
      case 'validated':
        console.log(`Order ${order.id} validated - funds sent to recipient`);
        await handleOrderValidated(order);
        break;
        
      case 'settled':
        console.log(`Order ${order.id} settled - completed on blockchain`);
        await handleOrderSettled(order);
        break;
        
      case 'refunded':
        console.log(`Order ${order.id} refunded to sender`);
        await handleOrderRefunded(order);
        break;
        
      case 'expired':
        console.log(`Order ${order.id} expired without completion`);
        await handleOrderExpired(order);
        break;
        
      default:
        console.log(`Unknown order status: ${order.status} for order ${order.id}`);
    }

    // TODO: Store order status in database
    // await updateOrderInDatabase(order.id, order.status, order);

    return NextResponse.json(
      { message: 'Webhook received successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('PayCrest webhook processing error:', error);
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleOrderPending(order: PaycrestOrder) {
  // Order created, waiting for provider assignment
  // You might want to update UI status or notify user
  console.log(`Order ${order.id} is pending, waiting for provider assignment`);
}

async function handleOrderValidated(order: PaycrestOrder) {
  // Funds have been sent to recipient's bank/mobile network
  // This is when you can consider the transaction successful from user perspective
  console.log(`Order ${order.id} validated - recipient should have received funds`);
  
  // TODO: Send success notification to user
  // TODO: Update transaction status in database
  // TODO: Trigger any post-transaction logic
}

async function handleOrderSettled(order: PaycrestOrder) {
  // Order fully completed on blockchain
  // Provider has received the stablecoin
  console.log(`Order ${order.id} settled on blockchain`);
}

async function handleOrderRefunded(order: PaycrestOrder) {
  // Funds refunded to sender
  // Something went wrong with the transaction
  console.log(`Order ${order.id} was refunded - transaction failed`);
  
  // TODO: Notify user of refund
  // TODO: Update transaction status
  // TODO: Handle refund logic
}

async function handleOrderExpired(order: PaycrestOrder) {
  // Order expired without completion
  // User didn't send funds within the time limit
  console.log(`Order ${order.id} expired - user didn't send funds in time`);
  
  // TODO: Notify user that order expired
  // TODO: Clean up any pending state
}