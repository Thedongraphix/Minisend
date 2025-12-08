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

  // Background
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, 297, 'F');

  // Logo / Brand
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.setTextColor(...gray900);
  pdf.text('Minisend', pageWidth / 2, y, { align: 'center' });
  y += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...gray600);
  pdf.text('USDC to M-Pesa Receipt', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Receipt number and date
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

  // Amount - Large and prominent
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(32);
  pdf.setTextColor(...gray900);
  pdf.text(`${data.currency} ${data.amount.toLocaleString()}`, pageWidth / 2, y, { align: 'center' });
  y += 12;

  // Recipient
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(...gray600);
  pdf.text(`To: ${data.recipientName}`, pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Payment method
  const paymentMethod = data.phoneNumber || data.tillNumber
    ? (data.tillNumber ? `Till ${data.tillNumber}` : data.phoneNumber)
    : `Paybill ${data.paybillNumber}${data.paybillAccount ? ` - ${data.paybillAccount}` : ''}`;
  pdf.text(paymentMethod, pageWidth / 2, y, { align: 'center' });
  y += 18;

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

    // QR label
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

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  // Row helper
  const row = (label: string, value: string) => {
    pdf.setTextColor(...gray600);
    pdf.text(label, leftX, y);
    pdf.setTextColor(...gray900);
    pdf.text(value, rightX, y, { align: 'right' });
    y += lineHeight;
  };

  row('Amount sent', `$${data.usdcAmount.toFixed(2)} USDC`);
  row('Exchange rate', `1 USDC = ${data.exchangeRate.toFixed(2)} ${data.currency}`);
  row('Fee', `${data.currency} ${data.fee.toFixed(2)}`);
  row('Total received', `${data.currency} ${data.amount.toLocaleString()}`);

  y += 6;
  row('M-Pesa code', data.receiptNumber);
  row('Transaction ID', `${data.transactionCode.slice(0, 16)}...`);

  y += 12;

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(...gray600);
  pdf.text('Minisend - USDC to M-Pesa', pageWidth / 2, y, { align: 'center' });
  y += 4;
  pdf.text('app.minisend.xyz', pageWidth / 2, y, { align: 'center' });

  return pdf.output('blob');
}
