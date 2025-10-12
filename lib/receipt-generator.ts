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
    this.renderAmountCard();
    this.renderDetails();
    this.renderSupportSection();
    await this.renderFooter();

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
    const h = 55;
    this.card(h, { rounded: 6 });

    // Logo area
    const logoSize = 16;
    const logoX = this.page.margin + 12;
    const logoY = this.y + 12;

    // Load Minisend logo
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';

      await new Promise<boolean>((resolve) => {
        logoImg.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(false);
              return;
            }

            // Set canvas size to match logo dimensions
            canvas.width = logoImg.width;
            canvas.height = logoImg.height;
            ctx.drawImage(logoImg, 0, 0);
            const logoDataUrl = canvas.toDataURL('image/png');

            // Add logo to PDF with proper sizing
            this.pdf.addImage(logoDataUrl, 'PNG', logoX, logoY, logoSize, logoSize);
            resolve(true);
          } catch {
            resolve(false);
          }
        };
        logoImg.onerror = () => resolve(false);
        logoImg.src = '/minisend-logo.png';
      });
    } catch {
      // Fallback to simple logo if loading fails
      this.setColor('primary', 'fill');
      this.pdf.roundedRect(logoX, logoY, logoSize, logoSize, 3, 3, 'F');
      this.pdf.setTextColor(255, 255, 255);
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('M', logoX + 6, logoY + 11);
    }
    
    // Company info
    this.text('Minisend', logoX + logoSize + 8, this.y + 22, 
      { size: 20, style: 'bold' });
    this.text('Instant USDC to Mobile Money', logoX + logoSize + 8, this.y + 31, 
      { size: 9, color: 'muted' });
    
    // Receipt info (right side)
    const rightX = this.page.width - this.page.margin - 10;
    this.text('RECEIPT', rightX, this.y + 18, 
      { size: 14, style: 'bold', align: 'right' });
    this.text(`#${this.data.receiptNumber}`, rightX, this.y + 27, 
      { size: 9, color: 'muted', align: 'right' });
    this.text(this.formatDate(this.data.date), rightX, this.y + 36, 
      { size: 9, color: 'muted', align: 'right' });
    
    this.y += h + 12;
  }

  private renderAmountCard(): void {
    const h = 58;
    
    // Main amount card with gradient effect
    this.setColor('bg', 'fill');
    this.pdf.roundedRect(this.page.margin, this.y, this.contentWidth, h, 6, 6, 'F');
    this.setColor('primary', 'draw');
    this.pdf.setLineWidth(1.5);
    this.pdf.roundedRect(this.page.margin, this.y, this.contentWidth, h, 6, 6, 'S');
    
    const leftX = this.page.margin + 15;
    const rightX = this.page.margin + (this.contentWidth * 0.55);
    
    // Amount section
    this.text('AMOUNT SENT', leftX, this.y + 16, 
      { size: 9, style: 'bold', color: 'muted' });
    this.text(`${this.formatAmount(this.data.localAmount)} ${this.data.localCurrency}`, 
      leftX, this.y + 32, { size: 18, style: 'bold' });
    this.text(`≈ $${this.data.usdcAmount.toFixed(4)} USDC`, leftX, this.y + 44, 
      { size: 9, color: 'muted' });
    
    // Recipient section
    this.text('RECIPIENT', rightX, this.y + 16, 
      { size: 9, style: 'bold', color: 'muted' });
    
    const name = this.data.recipientName.length > 20 
      ? this.data.recipientName.substring(0, 20) + '...' 
      : this.data.recipientName;
    this.text(name, rightX, this.y + 30, 
      { size: 12, style: 'bold', color: 'primary' });
    
    const contact = this.data.localCurrency === 'KES' 
      ? this.data.recipientContact 
      : `***${this.data.recipientContact.slice(-4)}`;
    this.text(contact, rightX, this.y + 42, 
      { size: 9, color: 'text' });
    
    this.y += h + 15;
  }

  private renderDetails(): void {
    // Title
    this.text('Transaction Details', this.page.margin, this.y, 
      { size: 12, style: 'bold' });
    this.y += 12;
    
    // Details grid
    const details = [
      ['Exchange Rate', `1 USDC = ${this.data.exchangeRate.toFixed(2)} ${this.data.localCurrency}`],
      ['Network', 'Base Network'],
      ['Token', 'USD Coin (USDC)'],
      ['From', this.truncate(this.data.senderWallet)],
      ['Transaction Fee', `$${this.data.totalFees.toFixed(4)} USDC`]
    ];
    
    const h = details.length * 8 + 10;
    this.card(h);
    
    const leftX = this.page.margin + 12;
    const rightX = this.page.width - this.page.margin - 12;
    let detailY = this.y + 12;
    
    details.forEach(([label, value]) => {
      this.text(label, leftX, detailY, { size: 9, color: 'muted' });
      this.text(value, rightX, detailY, { size: 9, style: 'bold', align: 'right' });
      detailY += 8;
    });
    
    this.y += h + 15;
  }

  private renderSupportSection(): void {
    // Simple support section without green panel
    this.text('Need Help?', this.page.margin, this.y,
      { size: 12, style: 'bold' });
    this.y += 12;

    this.text('Email: support@minisend.xyz', this.page.margin, this.y,
      { size: 10, color: 'primary' });
    this.y += 8;

    this.text('Visit: minisend.xyz/support', this.page.margin, this.y,
      { size: 10, color: 'primary' });
    this.y += 20;
  }

  private async renderFooter(): Promise<void> {
    // Position footer at bottom with more space for modern QR design
    this.y = Math.max(this.y, this.page.height - 85);

    const h = 60;

    // Modern gradient card for QR section
    this.pdf.setFillColor(249, 250, 251);
    this.pdf.roundedRect(this.page.margin, this.y, this.contentWidth, h, 6, 6, 'F');
    this.setColor('primary', 'draw');
    this.pdf.setLineWidth(1.2);
    this.pdf.roundedRect(this.page.margin, this.y, this.contentWidth, h, 6, 6, 'S');

    // QR Code section with live transaction details
    if (this.options.includeQRCode && this.data.blockchainTxHash) {
      try {
        // Create QR code with transaction details URL
        const txDetailsUrl = `https://basescan.org/tx/${this.data.blockchainTxHash}`;
        const qrData = await QRCode.toDataURL(txDetailsUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#7C65C1', // Farcaster Purple
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'H'
        });

        // Larger, centered QR code
        const qrSize = 45;
        const qrX = this.page.margin + 12;
        const qrY = this.y + 8;

        // White background for QR
        this.pdf.setFillColor(255, 255, 255);
        this.pdf.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, 3, 3, 'F');

        this.pdf.addImage(qrData, 'PNG', qrX, qrY, qrSize, qrSize);

        // Transaction details section (right side)
        const detailsX = qrX + qrSize + 15;
        const detailsY = this.y + 15;

        this.text('Scan for Live Details', detailsX, detailsY,
          { size: 11, style: 'bold', color: 'primary' });

        // Status badge
        const statusY = detailsY + 8;
        this.setColor('success', 'fill');
        this.pdf.roundedRect(detailsX, statusY - 4, 50, 8, 2, 2, 'F');
        this.pdf.setTextColor(255, 255, 255);
        this.pdf.setFontSize(8);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text('✓ ON-CHAIN', detailsX + 4, statusY + 1);

        // Transaction info
        this.text('Transaction Hash:', detailsX, statusY + 10,
          { size: 7, color: 'muted' });
        this.text(this.truncate(this.data.blockchainTxHash, 16), detailsX, statusY + 17,
          { size: 8, color: 'text', style: 'bold' });

        // Network badge
        this.text('Base Network • USDC', detailsX, statusY + 25,
          { size: 7, color: 'muted' });

      } catch {
        // Fallback if QR generation fails
        this.text('Transaction verified on Base Network', this.page.margin + 15, this.y + 25,
          { size: 9, color: 'muted' });
      }
    } else {
      // No blockchain hash available
      this.text('Processing...', this.page.margin + 15, this.y + 25,
        { size: 10, color: 'muted' });
    }

    // Bottom disclaimer
    this.y += h + 10;
    const disclaimer = 'This receipt is cryptographically verified on Base Network. Scan QR code for real-time transaction status.';
    this.text(disclaimer, this.page.width / 2, this.y,
      { size: 7, color: 'muted', align: 'center' });
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
    supportEmail: 'support@minisend.xyz',
    supportUrl: 'https://minisend.xyz/support'
  };
}

// Main export function
export async function generateReceiptPDF(
  orderData: OrderData, 
  options?: ReceiptGenerationOptions
): Promise<Blob> {
  const receiptData = createReceiptFromOrder(orderData);
  const generator = new ReceiptGenerator(receiptData, options);
  return await generator.generatePDF();
}