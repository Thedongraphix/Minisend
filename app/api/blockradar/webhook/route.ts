/**
 * Webhook Handler
 * Processes deposit and settlement events, sends email notifications to users
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(apiKey);
}

/** Plain JSON response with Content-Encoding: identity to prevent
 *  Vercel edge CDN Brotli compression (Z_BUF_ERROR workaround). */
function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Content-Encoding': 'identity',
    },
  });
}

function getEstimatedSettlementTime(blockchainSlug: string): string {
  const times: Record<string, string> = {
    'arbitrum': '13-19 minutes',
    'avalanche': '8-15 seconds',
    'base': '13-19 minutes',
    'ethereum': '13-19 minutes',
    'optimism': '13-19 minutes',
    'polygon': '8-15 seconds',
    'lisk': '13-19 minutes',
    'celo': '5-10 seconds',
  };
  return times[blockchainSlug.toLowerCase()] || '10-20 minutes';
}

// ─── Email: shared layout ───────────────────────────────────────────────────

function emailLayout(headerBg: string, headerText: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f5f5f7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:${headerBg};padding:36px 30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;">${headerText}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 30px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9f9fb;padding:24px 30px;text-align:center;border-top:1px solid #e5e5ea;">
              <p style="margin:0 0 6px;color:#86868b;font-size:12px;">
                <a href="https://app.minisend.xyz" style="color:#0052FF;text-decoration:none;font-weight:500;">app.minisend.xyz</a>
              </p>
              <p style="margin:0;color:#aeaeb2;font-size:11px;">Minisend &mdash; Send money to mobile wallets</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function detailsTable(rows: [string, string][]): string {
  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="color:#86868b;font-size:14px;font-weight:500;padding:8px 0;">${label}</td>
          <td style="color:#1d1d1f;font-size:14px;font-weight:600;text-align:right;padding:8px 0;">${value}</td>
        </tr>`
    )
    .join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f7;border-radius:8px;margin:24px 0;">
    <tr><td style="padding:16px 20px;"><table width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table></td></tr>
  </table>`;
}

function statusBox(color: string, borderColor: string, content: string): string {
  return `<div style="background-color:${color};border-left:4px solid ${borderColor};border-radius:4px;padding:14px 16px;margin:20px 0;">
    <p style="margin:0;color:#1d1d1f;font-size:14px;line-height:1.5;">${content}</p>
  </div>`;
}

// ─── Email senders ──────────────────────────────────────────────────────────

async function sendDepositReceivedEmail(
  to: string,
  amount: string,
  asset: string,
  network: string,
  estimatedTime: string,
  txHash: string
): Promise<void> {
  try {
    const body = `
      <p style="margin:0 0 16px;color:#1d1d1f;font-size:16px;line-height:1.6;">
        Your deposit has been received and is now being processed. Your funds will be converted to USDC and settled to your Minisend wallet on Base.
      </p>
      ${detailsTable([
        ['Amount', `${amount} ${asset}`],
        ['Network', network],
        ['Est. Settlement', estimatedTime],
      ])}
      ${statusBox('#e8f5e9', '#4caf50',
        `<strong>What happens next</strong><br/>
        Your ${asset} is being converted to USDC and transferred to Base. We'll send you another email once your funds are available.`
      )}
      <p style="margin:20px 0 0;color:#aeaeb2;font-size:12px;word-break:break-all;">
        Tx: <span style="font-family:monospace;">${txHash}</span>
      </p>`;

    const resend = getResendClient();
    await resend.emails.send({
      from: 'Minisend <info.minisend.xyz>',
      to,
      subject: `Deposit Received — ${amount} ${asset}`,
      html: emailLayout('linear-gradient(135deg,#0052FF 0%,#003ECB 100%)', 'Deposit Received', body),
    });
    console.log('Email sent: deposit received', { to, amount, asset });
  } catch (error) {
    console.error('Failed to send deposit received email:', error);
  }
}

async function sendDepositFailedEmail(
  to: string,
  amount: string,
  asset: string,
  network: string,
  txHash: string
): Promise<void> {
  try {
    const body = `
      <p style="margin:0 0 16px;color:#1d1d1f;font-size:16px;line-height:1.6;">
        We detected a deposit that could not be processed. No funds have been deducted from your account.
      </p>
      ${detailsTable([
        ['Amount', `${amount} ${asset}`],
        ['Network', network],
      ])}
      ${statusBox('#fce4ec', '#e53935',
        `<strong>What to do</strong><br/>
        Please try your deposit again. If the issue continues, contact our support team for assistance.`
      )}
      <p style="margin:20px 0 0;color:#aeaeb2;font-size:12px;word-break:break-all;">
        Tx: <span style="font-family:monospace;">${txHash}</span>
      </p>`;

    const resend = getResendClient();
    await resend.emails.send({
      from: 'Minisend <info.minisend.xyz>',
      to,
      subject: `Deposit Failed — ${amount} ${asset}`,
      html: emailLayout('linear-gradient(135deg,#E53935 0%,#C62828 100%)', 'Deposit Failed', body),
    });
    console.log('Email sent: deposit failed', { to, amount, asset });
  } catch (error) {
    console.error('Failed to send deposit failed email:', error);
  }
}

async function sendSettlementCompleteEmail(
  to: string,
  originalAmount: string,
  originalAsset: string,
  settledAmount: string,
  network: string
): Promise<void> {
  try {
    const body = `
      <p style="margin:0 0 16px;color:#1d1d1f;font-size:16px;line-height:1.6;">
        Your funds have been converted and are now available in your Minisend wallet on Base.
      </p>
      ${detailsTable([
        ['Deposited', `${originalAmount} ${originalAsset}`],
        ['Settled', `${settledAmount} USDC`],
        ['Origin Network', network],
        ['Destination', 'Base'],
      ])}
      ${statusBox('#e3f2fd', '#1976d2',
        `<strong>Funds available</strong><br/>
        Your USDC is ready to use. You can now send money to mobile wallets or withdraw at any time.`
      )}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr>
          <td align="center">
            <a href="https://app.minisend.xyz" style="display:inline-block;background:#0052FF;color:#ffffff;font-size:15px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;">
              Open Minisend
            </a>
          </td>
        </tr>
      </table>`;

    const resend = getResendClient();
    await resend.emails.send({
      from: 'Minisend <info.minisend.xyz>',
      to,
      subject: `Funds Available — ${settledAmount} USDC on Base`,
      html: emailLayout('linear-gradient(135deg,#0052FF 0%,#003ECB 100%)', 'Funds Available', body),
    });
    console.log('Email sent: settlement complete', { to, settledAmount });
  } catch (error) {
    console.error('Failed to send settlement complete email:', error);
  }
}

// ─── Deposit tracking ───────────────────────────────────────────────────────

async function storeDeposit(
  txId: string,
  userId: string,
  email: string,
  wallet: string,
  amount: string,
  assetSymbol: string,
  blockchainSlug: string,
  blockchainName: string,
  txHash: string
): Promise<void> {
  const { error } = await supabase.from('deposit_events').upsert(
    {
      blockradar_tx_id: txId,
      user_id: userId,
      email,
      minisend_wallet: wallet,
      amount,
      asset_symbol: assetSymbol,
      blockchain_slug: blockchainSlug,
      blockchain_name: blockchainName,
      tx_hash: txHash,
      status: 'received',
    },
    { onConflict: 'blockradar_tx_id' }
  );
  if (error) {
    console.error('Failed to store deposit event:', error);
  }
}

async function matchDepositForSwap(
  depositTxId?: string,
  settleAmount?: string
): Promise<{ email: string; amount: string; asset_symbol: string; blockchain_name: string; id: string } | null> {
  // Primary: match by deposit transaction ID (swap reference → deposit blockradar_tx_id)
  if (depositTxId) {
    const { data, error } = await supabase
      .from('deposit_events')
      .select('id, email, amount, asset_symbol, blockchain_name')
      .eq('status', 'received')
      .eq('blockradar_tx_id', depositTxId)
      .single();

    if (!error && data) {
      console.log('Deposit matched by tx ID:', depositTxId);
      return data;
    }
    console.warn('No deposit found for tx ID:', depositTxId);
  }

  // Fallback: approximate amount matching (within 5% tolerance)
  if (settleAmount) {
    const target = parseFloat(settleAmount);
    if (!isNaN(target)) {
      const { data: candidates } = await supabase
        .from('deposit_events')
        .select('id, email, amount, asset_symbol, blockchain_name')
        .eq('status', 'received')
        .order('created_at', { ascending: false })
        .limit(20);

      if (candidates && candidates.length > 0) {
        let bestMatch = null;
        let bestDiff = Infinity;
        for (const row of candidates) {
          const diff = Math.abs(parseFloat(row.amount) - target);
          const pct = diff / target;
          if (pct <= 0.05 && diff < bestDiff) {
            bestDiff = diff;
            bestMatch = row;
          }
        }
        if (bestMatch) {
          console.log('Deposit matched by approximate amount:', {
            settleAmount,
            depositAmount: bestMatch.amount,
            diff: bestDiff.toFixed(6),
          });
          return bestMatch;
        }
      }
    }
    console.warn('No matching deposit found for settle amount:', settleAmount);
  }

  return null;
}

async function markDepositSettled(depositId: string): Promise<void> {
  await supabase
    .from('deposit_events')
    .update({ status: 'settled' })
    .eq('id', depositId);
}

// ─── Webhook handler ────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = await request.json();
    const event = payload?.event as string;
    const data = payload?.data;

    console.log('Webhook received:', {
      event,
      type: data?.type,
      amount: data?.amount,
      blockchain: data?.blockchain?.slug,
      status: data?.status,
    });

    // ── Handle deposit events ──────────────────────────────────────────
    if (data?.type === 'DEPOSIT' || data?.type === 'GATEWAY_DEPOSIT') {
      const recipientAddress = data.recipientAddress;

      const { data: user, error: userError } = await supabase
        .from('minisend_users')
        .select('email, user_id')
        .eq('minisend_wallet', recipientAddress)
        .single();

      if (userError || !user) {
        console.warn('User not found for address:', recipientAddress);
        return jsonResponse({ received: true });
      }

      const assetSymbol = data.asset?.symbol || 'USDC';
      const blockchainSlug = data.blockchain?.slug || 'unknown';
      const blockchainName = data.blockchain?.name || blockchainSlug;
      const txHash = data.hash || '';

      // Store deposit for later swap matching
      await storeDeposit(
        data.id,
        user.user_id,
        user.email || '',
        recipientAddress,
        data.amount,
        assetSymbol,
        blockchainSlug,
        blockchainName,
        txHash
      );

      // Send email if user has one
      if (user.email) {
        const isSuccess = event === 'deposit.success' || event === 'gateway-deposit.success';
        const isFailed = event === 'deposit.failed' || event === 'gateway-deposit.failed';
        const estimatedTime = getEstimatedSettlementTime(blockchainSlug);

        if (isSuccess) {
          await sendDepositReceivedEmail(
            user.email, data.amount, assetSymbol, blockchainName, estimatedTime, txHash
          );
        } else if (isFailed) {
          await sendDepositFailedEmail(
            user.email, data.amount, assetSymbol, blockchainName, txHash
          );
        }
      }

      return jsonResponse({ received: true, processed: true, event });
    }

    // ── Handle swap/settlement events ──────────────────────────────────
    if (data?.type === 'SWAP') {
      const depositTxId = data.reference || null;
      const settleAmount = data.metadata?.swapAutoSettlement?.settleAmount || null;
      const settledAmount = data.toAmount || data.amount;

      console.log('Swap settlement details:', {
        depositTxId,
        settleAmount,
        settledAmount,
        event,
        status: data.status,
      });

      if (data.status === 'SUCCESS' && (depositTxId || settleAmount)) {
        const deposit = await matchDepositForSwap(depositTxId, settleAmount);

        if (deposit) {
          if (deposit.email) {
            await sendSettlementCompleteEmail(
              deposit.email,
              deposit.amount,
              deposit.asset_symbol,
              settledAmount || deposit.amount,
              deposit.blockchain_name
            );
          }
          await markDepositSettled(deposit.id);
        }
      }

      return jsonResponse({ received: true, processed: true, event });
    }

    // ── All other events — acknowledge without processing ──────────────
    return jsonResponse({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return jsonResponse({
      received: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
