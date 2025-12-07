import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { ReceiptData, ReceiptGenerationOptions } from './types/receipt';
import { OrderData } from './types/order';

export class ReceiptGenerator {
  private pdf: jsPDF;
  private data: ReceiptData;
  private options: ReceiptGenerationOptions;
  
  // Layout constants
  private readonly page = { width: 210, height: 297, margin: 20 };
  private readonly contentWidth = this.page.width - (this.page.margin * 2);
  private y = this.page.margin;
  
  // Design tokens
  private readonly colors = {
    primary: { r: 168, g: 85, b: 247 },     // Purple
    success: { r: 34, g: 197, b: 94 },      // Green
    text: { r: 17, g: 24, b: 39 },          // Dark
    muted: { r: 100, g: 116, b: 139 },      // Gray
    border: { r: 229, g: 231, b: 235 },     // Light gray
    bg: { r: 249, g: 250, b: 251 }          // Off-white
  };

  constructor(data: ReceiptData, options: ReceiptGenerationOptions = {}) {
    this.pdf = new jsPDF('portrait', 'mm', 'a4');
    this.data = data;
    this.options = { includeQRCode: true, ...options };
  }

  async generatePDF(): Promise<Blob> {
    this.setupDocument();
    await this.renderHeader();
    this.renderTransactionInfo();
    await this.renderQRCode();
    this.renderFooter();

    return this.pdf.output('blob');
  }

  private setupDocument(): void {
    // Set background
    this.setColor('bg', 'fill');
    this.pdf.rect(0, 0, this.page.width, this.page.height, 'F');
    this.pdf.setFont('helvetica');
  }

  // Helper methods for cleaner code
  private setColor(color: 'primary' | 'success' | 'text' | 'muted' | 'border' | 'bg', type: 'text' | 'fill' | 'draw'): void {
    const c = this.colors[color];
    if (type === 'text') this.pdf.setTextColor(c.r, c.g, c.b);
    else if (type === 'fill') this.pdf.setFillColor(c.r, c.g, c.b);
    else this.pdf.setDrawColor(c.r, c.g, c.b);
  }

  private text(content: string, x: number, y: number, options: {
    size?: number;
    style?: 'normal' | 'bold';
    color?: 'primary' | 'success' | 'text' | 'muted' | 'border' | 'bg';
    align?: 'left' | 'right' | 'center';
  } = {}): void {
    const { size = 10, style = 'normal', color = 'text', align = 'left' } = options;
    
    this.pdf.setFontSize(size);
    this.pdf.setFont('helvetica', style);
    this.setColor(color, 'text');
    
    let xPos = x;
    if (align === 'right') {
      xPos = x - this.pdf.getTextWidth(content);
    } else if (align === 'center') {
      xPos = x - (this.pdf.getTextWidth(content) / 2);
    }
    
    this.pdf.text(content, xPos, y);
  }

  private card(height: number, options: { filled?: boolean; rounded?: number } = {}): void {
    const { filled = true, rounded = 4 } = options;
    
    if (filled) {
      this.pdf.setFillColor(255, 255, 255);
      this.pdf.roundedRect(this.page.margin, this.y, this.contentWidth, height, rounded, rounded, 'F');
    }
    
    this.setColor('border', 'draw');
    this.pdf.setLineWidth(0.8);
    this.pdf.roundedRect(this.page.margin, this.y, this.contentWidth, height, rounded, rounded, 'S');
  }

  private async renderHeader(): Promise<void> {
    // Add Minisend logo
    try {
      const logoSize = 20;
      const logoX = (this.page.width - logoSize) / 2;
      const logoY = this.y;

      // Try to load and add logo
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';

      await new Promise<void>((resolve) => {
        logoImg.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
              canvas.width = logoImg.width;
              canvas.height = logoImg.height;
              ctx.drawImage(logoImg, 0, 0);
              const logoDataUrl = canvas.toDataURL('image/png');
              this.pdf.addImage(logoDataUrl, 'PNG', logoX, logoY, logoSize, logoSize);
            }
          } catch {
            // Fallback to text logo
            this.renderTextLogo(logoX, logoY, logoSize);
          }
          resolve();
        };
        logoImg.onerror = () => {
          this.renderTextLogo(logoX, logoY, logoSize);
          resolve();
        };
        logoImg.src = '/minisend-logo.png';
      });

      this.y += logoSize + 8;
    } catch {
      // If logo fails, use text logo
      this.y += 5;
    }

    // Company name with larger, bolder font
    this.text('MINISEND', this.page.width / 2, this.y,
      { size: 28, style: 'bold', align: 'center', color: 'primary' });
    this.y += 10;

    this.text('Payment Receipt', this.page.width / 2, this.y,
      { size: 14, style: 'bold', align: 'center', color: 'text' });
    this.y += 15;

    // Date and receipt number with better visibility
    this.text(this.formatDate(this.data.date), this.page.width / 2, this.y,
      { size: 10, style: 'bold', align: 'center', color: 'muted' });

    if (this.data.receiptNumber) {
      this.y += 6;
      this.text(`Receipt #${this.data.receiptNumber}`, this.page.width / 2, this.y,
        { size: 9, align: 'center', color: 'muted' });
    }

    this.y += 20;
  }

  private renderTextLogo(x: number, y: number, size: number): void {
    // Fallback text logo if image fails to load
    this.setColor('primary', 'fill');
    this.pdf.roundedRect(x, y, size, size, 3, 3, 'F');
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('M', x + 7, y + 14);
  }

  private renderTransactionInfo(): void {
    // Draw card with white background
    const boxHeight = 140;
    this.pdf.setFillColor(255, 255, 255);
    this.pdf.roundedRect(this.page.margin, this.y, this.contentWidth, boxHeight, 4, 4, 'F');
    this.pdf.setDrawColor(168, 85, 247);
    this.pdf.setLineWidth(1);
    this.pdf.roundedRect(this.page.margin, this.y, this.contentWidth, boxHeight, 4, 4, 'S');

    const leftX = this.page.margin + 12;
    const rightX = this.page.width - this.page.margin - 12;
    let currentY = this.y + 18;

    // Transaction Status Header
    this.text('TRANSACTION DETAILS', this.page.width / 2, currentY,
      { size: 11, style: 'bold', align: 'center', color: 'primary' });
    currentY += 15;

    // Amount sent - larger and bolder
    this.text('Amount Sent', leftX, currentY, { size: 11, style: 'bold', color: 'text' });
    this.text(`${this.formatAmount(this.data.localAmount)} ${this.data.localCurrency}`,
      rightX, currentY, { size: 16, style: 'bold', align: 'right', color: 'primary' });
    currentY += 10;

    // USDC equivalent
    this.text(`≈ $${this.data.usdcAmount.toFixed(2)} USDC`,
      rightX, currentY, { size: 10, style: 'bold', color: 'muted', align: 'right' });
    currentY += 18;

    // Divider
    this.pdf.setDrawColor(220, 220, 220);
    this.pdf.setLineWidth(0.5);
    this.pdf.line(leftX, currentY, rightX, currentY);
    currentY += 14;

    // Recipient - bolder
    this.text('Recipient', leftX, currentY, { size: 11, style: 'bold', color: 'text' });
    this.text(this.data.recipientName,
      rightX, currentY, { size: 12, style: 'bold', align: 'right', color: 'text' });
    currentY += 10;

    this.text(this.data.recipientContact,
      rightX, currentY, { size: 10, color: 'muted', align: 'right' });
    currentY += 18;

    // Divider
    this.pdf.line(leftX, currentY, rightX, currentY);
    currentY += 14;

    // M-Pesa Code (if available) - more prominent
    if (this.data.mpesaReceiptNumber) {
      this.text('M-Pesa Confirmation', leftX, currentY, { size: 11, style: 'bold', color: 'text' });
      this.text(this.data.mpesaReceiptNumber,
        rightX, currentY, { size: 13, style: 'bold', align: 'right', color: 'success' });
      currentY += 14;
    }

    // Blockchain hash
    if (this.data.blockchainTxHash) {
      this.text('Blockchain TX', leftX, currentY, { size: 9, style: 'bold', color: 'muted' });
      this.text(this.truncate(this.data.blockchainTxHash, 20),
        rightX, currentY, { size: 9, style: 'bold', align: 'right', color: 'muted' });
    }

    this.y += boxHeight + 20;
  }

  private async renderQRCode(): Promise<void> {
    if (!this.data.blockchainTxHash) return;

    try {
      const basescanUrl = `https://basescan.org/tx/${this.data.blockchainTxHash}`;
      const qrSize = 50;
      const qrX = (this.page.width - qrSize) / 2;
      const qrY = this.y;

      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(basescanUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#111827',
          light: '#FFFFFF'
        }
      });

      // Add QR code to PDF
      this.pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      this.y += qrSize + 8;

      // QR code label
      this.text('Scan to view on BaseScan', this.page.width / 2, this.y,
        { size: 9, style: 'bold', align: 'center', color: 'muted' });

      this.y += 15;
    } catch (error) {
      console.error('QR code generation failed:', error);
      // Continue without QR code
    }
  }

  private renderFooter(): void {
    // Simple footer
    this.y = this.page.height - 35;

    this.text('Powered by Minisend • Base Network', this.page.width / 2, this.y,
      { size: 10, style: 'bold', color: 'muted', align: 'center' });
    this.y += 7;

    this.text('support@minisend.xyz', this.page.width / 2, this.y,
      { size: 9, color: 'muted', align: 'center' });
  }

  // Utility methods
  private formatAmount(amount: number): string {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  private truncate(text: string, maxLength: number = 20): string {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, 8)}...${text.substring(text.length - 8)}`;
  }
}

// Helper function to create receipt from order data
export function createReceiptFromOrder(orderData: OrderData): ReceiptData {
  const receiptNumber = `MSR${Date.now().toString().slice(-8)}`;
  const fees = (orderData.sender_fee || 0) + (orderData.transaction_fee || 0);
  
  return {
    transactionId: orderData.id || `TXN${Date.now()}`,
    paycrestOrderId: orderData.paycrest_order_id || orderData.id,
    date: orderData.created_at || new Date().toISOString(),
    status: orderData.status || 'completed',
    
    usdcAmount: orderData.amount_in_usdc || parseFloat(orderData.amount || '0'),
    localAmount: orderData.amount_in_local || 0,
    localCurrency: orderData.local_currency || orderData.currency,
    exchangeRate: orderData.rate || 0,
    
    senderFee: orderData.sender_fee || 0,
    transactionFee: orderData.transaction_fee || 0,
    totalFees: fees,
    netAmount: (orderData.amount_in_local || 0) - fees,
    
    recipientName: orderData.account_name || orderData.accountName || 'Unknown',
    recipientContact: orderData.local_currency === 'KES' 
      ? (orderData.phone_number || orderData.phoneNumber || 'Unknown')
      : (orderData.account_number || orderData.accountNumber || 'Unknown'),
    recipientBank: orderData.bank_name,
    
    senderWallet: orderData.wallet_address || orderData.returnAddress || '',
    
    network: 'base',
    token: 'USDC',
    blockchainTxHash: orderData.blockchain_tx_hash || orderData.transactionHash,
    
    receiptNumber,
    mpesaReceiptNumber: orderData.pretium_receipt_number, // M-Pesa transaction code
    supportEmail: 'support@minisend.xyz',
    supportUrl: 'https://app.minisend.xyz/support'
  };
}

// Main export function
export async function generateReceiptPDF(
  orderData: OrderData,
  options?: ReceiptGenerationOptions
): Promise<Blob> {
  const receiptData = createReceiptFromOrder(orderData);

  console.log('Receipt data created:', {
    localAmount: receiptData.localAmount,
    usdcAmount: receiptData.usdcAmount,
    recipientName: receiptData.recipientName,
    recipientContact: receiptData.recipientContact,
    mpesaReceiptNumber: receiptData.mpesaReceiptNumber,
    blockchainTxHash: receiptData.blockchainTxHash
  });

  const generator = new ReceiptGenerator(receiptData, options);
  return await generator.generatePDF();
}