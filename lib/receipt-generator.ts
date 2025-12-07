import jsPDF from 'jspdf';
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
    this.renderSimpleHeader();
    this.renderTransactionInfo();
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

  private renderSimpleHeader(): void {
    // Simple header with Minisend branding
    this.text('MINISEND', this.page.width / 2, this.y,
      { size: 24, style: 'bold', align: 'center', color: 'primary' });
    this.y += 8;

    this.text('Payment Receipt', this.page.width / 2, this.y,
      { size: 12, align: 'center', color: 'muted' });
    this.y += 15;

    // Date and receipt number
    this.text(this.formatDate(this.data.date), this.page.width / 2, this.y,
      { size: 9, align: 'center', color: 'muted' });
    this.y += 20;
  }

  private renderTransactionInfo(): void {
    // Draw simple border box
    const boxHeight = 130;
    this.pdf.setDrawColor(200, 200, 200);
    this.pdf.setLineWidth(0.5);
    this.pdf.rect(this.page.margin, this.y, this.contentWidth, boxHeight);

    const leftX = this.page.margin + 10;
    const rightX = this.page.width - this.page.margin - 10;
    let currentY = this.y + 15;

    // Amount sent
    this.text('Amount', leftX, currentY, { size: 10, color: 'muted' });
    this.text(`${this.formatAmount(this.data.localAmount)} ${this.data.localCurrency}`,
      rightX, currentY, { size: 12, style: 'bold', align: 'right' });
    currentY += 12;

    // USDC equivalent
    this.text('', leftX, currentY, { size: 9, color: 'muted' });
    this.text(`($${this.data.usdcAmount.toFixed(2)} USDC)`,
      rightX, currentY, { size: 9, color: 'muted', align: 'right' });
    currentY += 15;

    // Divider
    this.pdf.setDrawColor(230, 230, 230);
    this.pdf.line(leftX, currentY, rightX, currentY);
    currentY += 12;

    // Recipient
    this.text('To', leftX, currentY, { size: 10, color: 'muted' });
    this.text(this.data.recipientName,
      rightX, currentY, { size: 11, style: 'bold', align: 'right' });
    currentY += 10;

    this.text('', leftX, currentY, { size: 9, color: 'muted' });
    this.text(this.data.recipientContact,
      rightX, currentY, { size: 9, color: 'muted', align: 'right' });
    currentY += 15;

    // Divider
    this.pdf.line(leftX, currentY, rightX, currentY);
    currentY += 12;

    // M-Pesa Code (if available)
    if (this.data.mpesaReceiptNumber) {
      this.text('M-Pesa Code', leftX, currentY, { size: 10, color: 'muted' });
      this.text(this.data.mpesaReceiptNumber,
        rightX, currentY, { size: 11, style: 'bold', align: 'right', color: 'success' });
      currentY += 12;
    }

    // Blockchain hash
    if (this.data.blockchainTxHash) {
      this.text('Transaction Hash', leftX, currentY, { size: 9, color: 'muted' });
      this.text(this.truncate(this.data.blockchainTxHash, 16),
        rightX, currentY, { size: 9, align: 'right', color: 'muted' });
    }

    this.y += boxHeight + 25;
  }

  private renderFooter(): void {
    // Simple footer
    this.y = this.page.height - 40;

    this.text('Powered by Minisend • Base Network', this.page.width / 2, this.y,
      { size: 9, color: 'muted', align: 'center' });
    this.y += 8;

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
  const generator = new ReceiptGenerator(receiptData, options);
  return await generator.generatePDF();
}