/**
 * BlockRadar Webhook Handler
 * Handles deposit events and sends email notifications to users
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Initialize Resend lazily to avoid build-time errors
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(apiKey);
}

/**
 * Get estimated settlement time based on blockchain
 */
function getEstimatedSettlementTime(blockchainSlug: string): string {
  const settlementTimes: Record<string, string> = {
    'arbitrum': '13-19 minutes',
    'avalanche': '8-15 seconds',
    'base': '13-19 minutes',
    'ethereum': '13-19 minutes',
    'optimism': '13-19 minutes',
    'polygon': '8-15 seconds',
    'lisk': '13-19 minutes',
    'celo': '5-10 seconds',
  };

  return settlementTimes[blockchainSlug.toLowerCase()] || '10-20 minutes';
}

/**
 * Send deposit notification email to user
 */
async function sendDepositNotification(
  userEmail: string,
  amount: string,
  assetSymbol: string,
  blockchain: string,
  estimatedTime: string,
  txHash: string
): Promise<void> {
  try {
    const resend = getResendClient();
    await resend.emails.send({
      from: 'Minisend <info@minisend.xyz>',
      to: userEmail,
      subject: `✅ ${amount} ${assetSymbol} Deposit Received`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Deposit Received</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f7;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f7; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #0052FF 0%, #0041CC 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Deposit Received! 🎉</h1>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <p style="margin: 0 0 20px; color: #1d1d1f; font-size: 16px; line-height: 1.6;">
                          We've successfully received your deposit and it's being processed via BlockRadar Gateway.
                        </p>

                        <!-- Deposit Details -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f7; border-radius: 8px; margin: 30px 0;">
                          <tr>
                            <td style="padding: 20px;">
                              <table width="100%" cellpadding="8" cellspacing="0">
                                <tr>
                                  <td style="color: #86868b; font-size: 14px; font-weight: 500;">Amount:</td>
                                  <td style="color: #1d1d1f; font-size: 16px; font-weight: 600; text-align: right;">${amount} ${assetSymbol}</td>
                                </tr>
                                <tr>
                                  <td style="color: #86868b; font-size: 14px; font-weight: 500;">Network:</td>
                                  <td style="color: #1d1d1f; font-size: 14px; text-align: right; text-transform: capitalize;">${blockchain}</td>
                                </tr>
                                <tr>
                                  <td style="color: #86868b; font-size: 14px; font-weight: 500;">Est. Settlement:</td>
                                  <td style="color: #1d1d1f; font-size: 14px; text-align: right;">${estimatedTime}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        <!-- Status Update -->
                        <div style="background-color: #d1f4e0; border-left: 4px solid #30d158; border-radius: 4px; padding: 16px; margin: 20px 0;">
                          <p style="margin: 0; color: #1d1d1f; font-size: 14px;">
                            <strong>⏱️ What's happening now:</strong><br/>
                            Your funds are being settled to your Minisend wallet on Base chain. You'll be able to withdraw or spend them once the settlement is complete.
                          </p>
                        </div>

                        <!-- Transaction Hash -->
                        <p style="margin: 20px 0 0; color: #86868b; font-size: 12px; word-break: break-all;">
                          Transaction: <span style="font-family: monospace;">${txHash}</span>
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f5f5f7; padding: 30px; text-align: center; border-top: 1px solid #d2d2d7;">
                        <p style="margin: 0 0 10px; color: #86868b; font-size: 12px;">
                          Questions? Visit <a href="https://app.minisend.xyz" style="color: #0052FF; text-decoration: none;">app.minisend.xyz</a>
                        </p>
                        <p style="margin: 0; color: #86868b; font-size: 12px;">
                          Minisend - Send money to mobile wallets
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    console.log('✅ Deposit notification sent:', {
      email: userEmail,
      amount,
      assetSymbol,
      blockchain,
    });
  } catch (error) {
    console.error('❌ Failed to send deposit notification:', error);
    // Don't throw - email failure shouldn't break webhook processing
  }
}

/**
 * Send deposit failed notification email to user
 */
async function sendDepositFailedNotification(
  userEmail: string,
  amount: string,
  assetSymbol: string,
  blockchain: string,
  txHash: string
): Promise<void> {
  try {
    const resend = getResendClient();
    await resend.emails.send({
      from: 'Minisend <info@minisend.xyz>',
      to: userEmail,
      subject: `⚠️ Deposit Failed - ${amount} ${assetSymbol}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Deposit Failed</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f7;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f7; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #FF3B30 0%, #CC2E26 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Deposit Failed ⚠️</h1>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <p style="margin: 0 0 20px; color: #1d1d1f; font-size: 16px; line-height: 1.6;">
                          We detected a deposit attempt that unfortunately failed to process.
                        </p>

                        <!-- Deposit Details -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f7; border-radius: 8px; margin: 30px 0;">
                          <tr>
                            <td style="padding: 20px;">
                              <table width="100%" cellpadding="8" cellspacing="0">
                                <tr>
                                  <td style="color: #86868b; font-size: 14px; font-weight: 500;">Amount:</td>
                                  <td style="color: #1d1d1f; font-size: 16px; font-weight: 600; text-align: right;">${amount} ${assetSymbol}</td>
                                </tr>
                                <tr>
                                  <td style="color: #86868b; font-size: 14px; font-weight: 500;">Network:</td>
                                  <td style="color: #1d1d1f; font-size: 14px; text-align: right; text-transform: capitalize;">${blockchain}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        <!-- Action Required -->
                        <div style="background-color: #ffe8e6; border-left: 4px solid #FF3B30; border-radius: 4px; padding: 16px; margin: 20px 0;">
                          <p style="margin: 0; color: #1d1d1f; font-size: 14px;">
                            <strong>What should I do?</strong><br/>
                            Please try depositing again or contact our support team if the issue persists.
                          </p>
                        </div>

                        <!-- Transaction Hash -->
                        <p style="margin: 20px 0 0; color: #86868b; font-size: 12px; word-break: break-all;">
                          Transaction: <span style="font-family: monospace;">${txHash}</span>
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f5f5f7; padding: 30px; text-align: center; border-top: 1px solid #d2d2d7;">
                        <p style="margin: 0 0 10px; color: #86868b; font-size: 12px;">
                          Need help? Contact us at <a href="https://app.minisend.xyz" style="color: #0052FF; text-decoration: none;">app.minisend.xyz</a>
                        </p>
                        <p style="margin: 0; color: #86868b; font-size: 12px;">
                          Minisend - Send money to mobile wallets
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    console.log('✅ Deposit failed notification sent:', {
      email: userEmail,
      amount,
      assetSymbol,
      blockchain,
    });
  } catch (error) {
    console.error('❌ Failed to send deposit failed notification:', error);
  }
}

/** Helper to return plain JSON responses without framework compression */
function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * POST /api/blockradar/webhook
 * Handles BlockRadar webhook events for all event types
 */
export async function POST(request: Request) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = await request.json();
    const event = payload?.event as string;
    const data = payload?.data;

    console.log('📨 BlockRadar webhook received:', {
      event,
      type: data?.type,
      amount: data?.amount,
      blockchain: data?.blockchain?.slug,
      status: data?.status,
    });

    // Only handle deposit events (both regular and gateway)
    const depositTypes = ['DEPOSIT', 'GATEWAY_DEPOSIT'];
    if (!depositTypes.includes(data?.type)) {
      console.log('⏭️ Skipping non-deposit event:', data?.type);
      return jsonResponse({ received: true });
    }

    // Extract recipient address (the user's Minisend wallet)
    const recipientAddress = data.recipientAddress;

    // Find user by their Minisend wallet address
    const { data: user, error: userError } = await supabase
      .from('minisend_users')
      .select('email, user_id')
      .eq('minisend_wallet', recipientAddress)
      .single();

    if (userError || !user) {
      console.warn('⚠️ User not found for address:', recipientAddress);
      return jsonResponse({ received: true });
    }

    if (!user.email) {
      console.warn('⚠️ User has no email:', user.user_id);
      return jsonResponse({ received: true });
    }

    // Get estimated settlement time
    const blockchainSlug = data.blockchain?.slug || 'unknown';
    const estimatedTime = getEstimatedSettlementTime(blockchainSlug);

    // Handle based on event type (both regular and gateway deposit events)
    const isSuccess = event === 'deposit.success' || event === 'gateway-deposit.success';
    const isFailed = event === 'deposit.failed' || event === 'gateway-deposit.failed';

    if (isSuccess) {
      await sendDepositNotification(
        user.email,
        data.amount,
        data.asset?.symbol || 'USDC',
        data.blockchain?.name || blockchainSlug,
        estimatedTime,
        data.hash
      );
    } else if (isFailed) {
      await sendDepositFailedNotification(
        user.email,
        data.amount,
        data.asset?.symbol || 'USDC',
        data.blockchain?.name || blockchainSlug,
        data.hash
      );
    }

    return jsonResponse({
      received: true,
      processed: true,
      event,
    });

  } catch (error) {
    console.error('❌ BlockRadar webhook error:', error);

    // Return 200 even on error to prevent webhook retries
    return jsonResponse({
      received: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
