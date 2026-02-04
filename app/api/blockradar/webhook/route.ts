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

function explorerTxUrl(slug: string, txHash: string): string {
  const explorers: Record<string, string> = {
    base: 'https://basescan.org/tx/',
    ethereum: 'https://etherscan.io/tx/',
    polygon: 'https://polygonscan.com/tx/',
    arbitrum: 'https://arbiscan.io/tx/',
    optimism: 'https://optimistic.etherscan.io/tx/',
    avalanche: 'https://snowtrace.io/tx/',
    celo: 'https://celoscan.io/tx/',
    lisk: 'https://blockscout.lisk.com/tx/',
  };
  const base = explorers[slug.toLowerCase()];
  return base ? `${base}${txHash}` : '';
}

// ─── Email: shared layout & helpers ─────────────────────────────────────────

const ASSET_BASE = 'https://app.minisend.xyz';

function inlineToken(amount: string, symbol: string): string {
  return `<img src="${ASSET_BASE}/usd-coin.png" width="16" height="16" alt="${symbol}" style="vertical-align:middle;margin-right:4px;" /><span style="font-weight:600;">${amount} ${symbol}</span>`;
}

function emailLayout(body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f7f7f8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f7f8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;">
          <!-- Logo -->
          <tr>
            <td style="padding:32px 32px 0;text-align:center;">
              <img src="${ASSET_BASE}/icon.png" width="40" height="40" alt="Minisend" style="border-radius:10px;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:24px 32px 32px;text-align:center;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;letter-spacing:0.02em;">onchain early truly spendable</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
    <tr>
      <td align="center">
        <a href="https://app.minisend.xyz" style="display:inline-block;background:#0052FF;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;">Launch Minisend</a>
      </td>
    </tr>
  </table>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="color:#9ca3af;font-size:13px;padding:6px 0;text-align:left;">${label}</td>
    <td style="color:#1a1a1a;font-size:13px;padding:6px 0;text-align:right;">${value}</td>
  </tr>`;
}

// ─── Email senders ──────────────────────────────────────────────────────────

async function sendDepositReceivedEmail(
  to: string,
  amount: string,
  asset: string,
  network: string,
  estimatedTime: string,
  txHash: string,
  blockchainSlug = ''
): Promise<void> {
  try {
    const body = `
      <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:18px;font-weight:600;">Deposit received</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
        We received your deposit and it's being settled to Base.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:10px;margin:0 0 20px;">
        <tr><td style="padding:14px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${detailRow('Amount', inlineToken(amount, asset))}
            ${detailRow('Network', `<span style="font-weight:600;">${network}</span>`)}
            ${detailRow('Est. settlement', estimatedTime)}
          </table>
        </td></tr>
      </table>
      <p style="margin:0 0 4px;color:#6b7280;font-size:13px;line-height:1.5;">
        We'll email you once your funds are available on Base.
      </p>
      ${ctaButton()}
      ${txHash ? `<p style="margin:24px 0 0;font-size:11px;word-break:break-all;">
        <a href="${explorerTxUrl(blockchainSlug, txHash)}" style="color:#9ca3af;text-decoration:none;" target="_blank">View on explorer &rarr;</a>
      </p>` : ''}`;

    const resend = getResendClient();
    await resend.emails.send({
      from: 'Minisend <info@minisend.xyz>',
      to,
      subject: `Deposit received — ${amount} ${asset}`,
      html: emailLayout(body),
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
  txHash: string,
  blockchainSlug = ''
): Promise<void> {
  try {
    const body = `
      <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:18px;font-weight:600;">Deposit failed</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
        Your deposit could not be processed. No funds were deducted.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:10px;margin:0 0 20px;">
        <tr><td style="padding:14px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${detailRow('Amount', inlineToken(amount, asset))}
            ${detailRow('Network', `<span style="font-weight:600;">${network}</span>`)}
          </table>
        </td></tr>
      </table>
      <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5;">
        Try again or reach out to support if the issue continues.
      </p>
      ${ctaButton()}
      ${txHash ? `<p style="margin:24px 0 0;font-size:11px;word-break:break-all;">
        <a href="${explorerTxUrl(blockchainSlug, txHash)}" style="color:#9ca3af;text-decoration:none;" target="_blank">View on explorer &rarr;</a>
      </p>` : ''}`;

    const resend = getResendClient();
    await resend.emails.send({
      from: 'Minisend <info@minisend.xyz>',
      to,
      subject: `Deposit failed — ${amount} ${asset}`,
      html: emailLayout(body),
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
      <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:18px;font-weight:600;">Funds available</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
        Your deposit has been settled. USDC is ready in your wallet on Base.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:10px;margin:0 0 20px;">
        <tr><td style="padding:14px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${detailRow('Deposited', inlineToken(originalAmount, originalAsset))}
            ${detailRow('Settled', inlineToken(settledAmount, 'USDC'))}
            ${detailRow('From', `<span style="font-weight:600;">${network}</span>`)}
            ${detailRow('To', '<span style="font-weight:600;">Base</span>')}
          </table>
        </td></tr>
      </table>
      ${ctaButton()}`;

    const resend = getResendClient();
    await resend.emails.send({
      from: 'Minisend <info@minisend.xyz>',
      to,
      subject: `\uD83C\uDF89 Funds available — ${settledAmount} USDC on Base`,
      html: emailLayout(body),
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
): Promise<{ email: string; amount: string; asset_symbol: string; blockchain_name: string; blockchain_slug: string; id: string } | null> {
  const cols = 'id, email, amount, asset_symbol, blockchain_name, blockchain_slug';

  // Primary: match by deposit transaction ID (swap reference → deposit blockradar_tx_id)
  if (depositTxId) {
    const { data, error } = await supabase
      .from('deposit_events')
      .select(cols)
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
        .select(cols)
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
            user.email, data.amount, assetSymbol, blockchainName, estimatedTime, txHash, blockchainSlug
          );
        } else if (isFailed) {
          await sendDepositFailedEmail(
            user.email, data.amount, assetSymbol, blockchainName, txHash, blockchainSlug
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
