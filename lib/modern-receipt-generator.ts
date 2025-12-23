import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface ReceiptData {
  transactionCode: string;
  receiptNumber: string;
  recipientName: string;
  phoneNumber?: string;
  tillNumber?: string;
  paybillNumber?: string;
  paybillAccount?: string;
  bankName?: string;
  amount: number;
  currency: string;
  usdcAmount: number;
  exchangeRate: number;
  fee: number;
  date: string;
  walletAddress: string;
  txHash: string;
}

/**
 * Modern minimal receipt generator
 * Clean design with QR code, minimal text, easy to read
 */
export async function generateModernReceipt(data: ReceiptData): Promise<Blob> {
  const pdf = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 25;
  let y = margin;

  // Colors
  const gray900: [number, number, number] = [17, 24, 39];
  const gray600: [number, number, number] = [75, 85, 99];
  const gray200: [number, number, number] = [229, 231, 235];
  const purple: [number, number, number] = [147, 51, 234]; // Brand purple color

  // Background
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, 297, 'F');

  // Logo / Brand - Purple and bold
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.setTextColor(...purple);
  pdf.text('Minisend', pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Dynamic receipt title based on currency
  const receiptTitle = data.currency === 'KES'
    ? 'USDC to M-Pesa Receipt'
    : data.currency === 'NGN'
    ? 'USDC to Bank Transfer Receipt'
    : 'USDC to Mobile Money Receipt';

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(...gray600);
  pdf.text(receiptTitle, pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Receipt number and date - Bold
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...gray600);
  pdf.text(`Receipt: ${data.receiptNumber}`, margin, y);
  pdf.text(data.date, pageWidth - margin, y, { align: 'right' });
  y += 12;

  // Divider
  pdf.setDrawColor(...gray200);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 12;

  // Amount - Large and prominent with purple color
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(32);
  pdf.setTextColor(...purple);
  pdf.text(`${data.currency} ${data.amount.toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
  y += 12;

  // Recipient - Bold
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...gray900);
  pdf.text(`To: ${data.recipientName}`, pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Payment method - Bold
  let paymentMethod = '';
  if (data.bankName) {
    // For NGN bank transfers
    paymentMethod = data.bankName;
    if (data.paybillAccount) {
      paymentMethod += ` - ${data.paybillAccount}`;
    }
  } else if (data.tillNumber) {
    paymentMethod = `Till ${data.tillNumber}`;
  } else if (data.phoneNumber) {
    paymentMethod = data.phoneNumber;
  } else if (data.paybillNumber) {
    paymentMethod = `Paybill ${data.paybillNumber}${data.paybillAccount ? ` - ${data.paybillAccount}` : ''}`;
  }

  if (paymentMethod) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(paymentMethod, pageWidth / 2, y, { align: 'center' });
    y += 18;
  }

  // QR Code - Centered
  try {
    const qrData = `https://basescan.org/tx/${data.txHash}`;
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 400,
      margin: 1,
      color: {
        dark: '#111827',
        light: '#FFFFFF'
      }
    });

    const qrSize = 50;
    const qrX = (pageWidth - qrSize) / 2;
    pdf.addImage(qrCodeDataUrl, 'PNG', qrX, y, qrSize, qrSize);
    y += qrSize + 8;

    // QR label - Bold
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...gray600);
    pdf.text('Scan to view on Base', pageWidth / 2, y, { align: 'center' });
    y += 15;
  } catch (error) {
    console.error('QR code generation failed:', error);
    y += 10;
  }

  // Divider
  pdf.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Transaction details - Two columns
  const leftX = margin;
  const rightX = pageWidth - margin;
  const lineHeight = 6;

  pdf.setFontSize(9);

  // Row helper - All text bold for visibility
  const row = (label: string, value: string, highlightValue = false) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...gray600);
    pdf.text(label, leftX, y);
    pdf.setFont('helvetica', 'bold');
    if (highlightValue) {
      pdf.setTextColor(...purple);
    } else {
      pdf.setTextColor(...gray900);
    }
    pdf.text(value, rightX, y, { align: 'right' });
    y += lineHeight;
  };

  row('Amount sent', `$${data.usdcAmount.toFixed(2)} USDC`);
  row('Exchange rate', `1 USDC = ${data.exchangeRate.toFixed(2)} ${data.currency}`);
  row('Fee', `${data.currency} ${data.fee.toFixed(2)}`);
  row('Total received', `${data.currency} ${data.amount.toLocaleString()}`, true); // Highlight total

  y += 6;

  // Dynamic reference code label based on currency
  const referenceLabel = data.currency === 'KES'
    ? 'M-Pesa code'
    : data.currency === 'NGN'
    ? 'Reference'
    : 'Transaction ref';

  row(referenceLabel, data.receiptNumber, true); // Highlight reference code
  row('Transaction ID', `${data.transactionCode.slice(0, 16)}...`);

  // Add bank name for NGN receipts
  if (data.currency === 'NGN' && data.bankName) {
    row('Bank', data.bankName);
  }

  y += 12;

  // Footer - Bold
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(...gray600);
  pdf.text('Minisend - Fast USDC off-ramp', pageWidth / 2, y, { align: 'center' });
  y += 4;
  pdf.text('app.minisend.xyz', pageWidth / 2, y, { align: 'center' });

  return pdf.output('blob');
}
