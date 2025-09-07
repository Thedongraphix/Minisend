import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { ReceiptData, ReceiptGenerationOptions } from './types/receipt';
import { OrderData } from './types/order';

export class ReceiptGenerator {
  private pdf: jsPDF;
  private data: ReceiptData;
  private options: ReceiptGenerationOptions;
  
  // Page dimensions and margins
  private readonly pageWidth = 210; // A4 width in mm
  private readonly pageHeight = 297; // A4 height in mm
  private readonly margin = 20;
  private readonly contentWidth = this.pageWidth - (this.margin * 2);
  private currentY = this.margin;

  constructor(data: ReceiptData, options: ReceiptGenerationOptions = {}) {
    this.pdf = new jsPDF('portrait', 'mm', 'a4');
    this.data = data;
    this.options = {
      includeQRCode: true,
      includeLogo: true,
      format: 'A4',
      language: 'en',
      ...options
    };
    
    // Set default font that closely matches Plus Jakarta Sans characteristics
    this.pdf.setFont('helvetica');
  }

  async generatePDF(): Promise<Blob> {
    // Set up the document with Plus Jakarta Sans-like styling
    this.setupFontStyling();
    
    // Header Section
    await this.addHeader();
    this.addSpacing(15);
    
    // Transaction Summary
    this.addTransactionSummary();
    this.addSpacing(10);
    
    // Payment Details
    this.addPaymentDetails();
    this.addSpacing(10);
    
    // Fee Breakdown
    this.addFeeBreakdown();
    this.addSpacing(15);
    
    // QR Code & Transaction Hash
    if (this.options.includeQRCode && this.data.blockchainTxHash) {
      await this.addQRCodeSection();
      this.addSpacing(10);
    }
    
    // Footer
    this.addFooter();
    
    return this.pdf.output('blob');
  }

  private setupFontStyling(): void {
    // Use helvetica as base, configured to match Plus Jakarta Sans characteristics
    // Plus Jakarta Sans is a geometric sans-serif with clean lines and good readability
    this.pdf.setFont('helvetica');
    
    // Set character spacing to match Plus Jakarta Sans's slightly wider character spacing
    // Note: jsPDF doesn't support character spacing directly, but we can adjust sizing accordingly
  }

  private async addHeader(): Promise<void> {
    // Brand header with Farcaster purple background
    this.pdf.setFillColor(124, 101, 193); // Farcaster Purple
    this.pdf.rect(this.margin, this.currentY, this.contentWidth, 25, 'F');
    
    // Add accent bar (Base Blue)
    this.pdf.setFillColor(0, 82, 255); // Base Blue
    this.pdf.rect(this.margin, this.currentY + 25, this.contentWidth, 3, 'F');
    
    // Add Minisend logo (we'll simulate it with a circle and arrow for PDF)
    this.pdf.setFillColor(59, 130, 246); // Blue circle
    this.pdf.circle(this.margin + 12, this.currentY + 12, 8, 'F');
    
    // Add arrow in logo
    this.pdf.setDrawColor(255, 255, 255);
    this.pdf.setLineWidth(1.5);
    this.pdf.line(this.margin + 7, this.currentY + 12, this.margin + 17, this.currentY + 12);
    this.pdf.line(this.margin + 14, this.currentY + 9, this.margin + 17, this.currentY + 12);
    this.pdf.line(this.margin + 14, this.currentY + 15, this.margin + 17, this.currentY + 12);
    
    // Company name and logo area
    this.pdf.setTextColor(255, 255, 255); // White text
    this.pdf.setFontSize(28);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Minisend', this.margin + 25, this.currentY + 18);
    
    // Tagline
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('USDC to Mobile Money • Powered by Base', this.margin + 25, this.currentY + 23);
    
    // Receipt info on the right
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    const receiptText = 'RECEIPT';
    const receiptWidth = this.pdf.getTextWidth(receiptText);
    this.pdf.text(receiptText, this.pageWidth - this.margin - receiptWidth - 10, this.currentY + 12);
    
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    const receiptNumber = `#${this.data.receiptNumber}`;
    const receiptNumWidth = this.pdf.getTextWidth(receiptNumber);
    this.pdf.text(receiptNumber, this.pageWidth - this.margin - receiptNumWidth - 10, this.currentY + 18);
    
    const dateText = this.formatDate(this.data.date);
    const dateWidth = this.pdf.getTextWidth(dateText);
    this.pdf.text(dateText, this.pageWidth - this.margin - dateWidth - 10, this.currentY + 23);
    
    this.currentY += 28;
  }

  private addTransactionSummary(): void {
    // Status Badge
    const statusColor = this.data.status === 'completed' ? [16, 185, 129] : 
                       this.data.status === 'pending' ? [245, 158, 11] : [239, 68, 68];
    
    this.pdf.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    this.pdf.roundedRect(this.margin, this.currentY, 40, 8, 2, 2, 'F');
    
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');
    const statusText = this.data.status.toUpperCase();
    this.pdf.text(statusText, this.margin + (40 - this.pdf.getTextWidth(statusText)) / 2, this.currentY + 5.5);
    
    this.currentY += 15;
    
    // Main transaction summary box
    this.pdf.setFillColor(249, 250, 251); // Light background
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 35, 3, 3, 'F');
    
    // Left side - Amount sent
    this.pdf.setTextColor(31, 41, 55); // Dark text
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Amount Sent', this.margin + 10, this.currentY + 8);
    
    this.pdf.setFontSize(20);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(124, 101, 193); // Farcaster Purple
    const amountText = `${this.formatCurrency(this.data.localAmount)} ${this.data.localCurrency}`;
    this.pdf.text(amountText, this.margin + 10, this.currentY + 20);
    
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(107, 114, 128); // Gray
    this.pdf.setFont('helvetica', 'normal');
    const usdcText = `≈ $${this.data.usdcAmount.toFixed(4)} USDC`;
    this.pdf.text(usdcText, this.margin + 10, this.currentY + 27);
    
    // Right side - Recipient
    const rightX = this.margin + this.contentWidth - 80;
    this.pdf.setTextColor(31, 41, 55);
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Sent To', rightX, this.currentY + 8);
    
    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(0, 82, 255); // Base Blue
    
    // Handle long recipient names
    const recipientName = this.data.recipientName;
    const maxWidth = 70;
    if (this.pdf.getTextWidth(recipientName) > maxWidth) {
      const splitName = this.pdf.splitTextToSize(recipientName, maxWidth);
      this.pdf.text(splitName, rightX, this.currentY + 16);
    } else {
      this.pdf.text(recipientName, rightX, this.currentY + 16);
    }
    
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(107, 114, 128);
    this.pdf.setFont('helvetica', 'normal');
    const contactText = this.data.localCurrency === 'KES' ? 
      `Mobile: ${this.data.recipientContact}` : 
      `Account: ${this.data.recipientContact}`;
    this.pdf.text(contactText, rightX, this.currentY + 27);
    
    this.currentY += 35;
  }

  private addPaymentDetails(): void {
    this.addSectionHeader('Payment Details');
    
    const details: [string, string][] = [
      ['Exchange Rate', `1 USDC = ${this.data.exchangeRate.toFixed(2)} ${this.data.localCurrency}`],
      ['Network', 'Base (Ethereum L2)'],
      ['Token', 'USDC'],
      ['Sender Wallet', this.truncateAddress(this.data.senderWallet)],
    ];
    
    if (this.data.localCurrency === 'NGN' && this.data.recipientBank) {
      details.splice(3, 0, ['Bank', this.data.recipientBank]);
    }
    
    this.addDetailsTable(details);
  }

  private addFeeBreakdown(): void {
    this.addSectionHeader('Fee Breakdown');
    
    const feeDetails: [string, string][] = [
      ['Local Amount', `${this.formatCurrency(this.data.localAmount)} ${this.data.localCurrency}`],
      ['Sender Fee', `$${this.data.senderFee.toFixed(4)} USDC`],
      ['Transaction Fee', `$${this.data.transactionFee.toFixed(4)} USDC`],
      ['Total Fees', `$${this.data.totalFees.toFixed(4)} USDC`],
    ];
    
    this.addDetailsTable(feeDetails);
    
    // Net amount received box with proper formatting
    this.pdf.setFillColor(16, 185, 129); // Green background
    this.pdf.roundedRect(this.margin, this.currentY + 5, this.contentWidth, 12, 2, 2, 'F');
    
    this.pdf.setTextColor(255, 255, 255); // White text
    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Net Amount Received by Recipient:', this.margin + 10, this.currentY + 12);
    
    this.pdf.setTextColor(255, 255, 255); // White for amount
    const netAmount = `${this.formatCurrency(this.data.netAmount)} ${this.data.localCurrency}`;
    const netWidth = this.pdf.getTextWidth(netAmount);
    this.pdf.text(netAmount, this.pageWidth - this.margin - netWidth - 10, this.currentY + 12);
    
    this.currentY += 17;
  }

  private async addQRCodeSection(): Promise<void> {
    if (!this.data.blockchainTxHash) return;
    
    this.addSectionHeader('Blockchain Verification');
    
    try {
      // Generate QR code for the transaction hash
      const qrCodeDataURL = await QRCode.toDataURL(
        `https://basescan.org/tx/${this.data.blockchainTxHash}`,
        { 
          width: 200, 
          margin: 2,
          color: {
            dark: '#1F2937',
            light: '#FFFFFF'
          }
        }
      );
      
      // Add QR code
      const qrSize = 30;
      this.pdf.addImage(qrCodeDataURL, 'PNG', this.margin, this.currentY, qrSize, qrSize);
      
      // Add transaction hash and link
      this.pdf.setTextColor(31, 41, 55);
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text('Transaction Hash:', this.margin + qrSize + 10, this.currentY + 8);
      
      this.pdf.setFontSize(9);
      this.pdf.setTextColor(0, 82, 255); // Base Blue
      this.pdf.setFont('helvetica', 'normal');
      const truncatedHash = `${this.data.blockchainTxHash.substring(0, 20)}...`;
      this.pdf.text(truncatedHash, this.margin + qrSize + 10, this.currentY + 15);
      
      this.pdf.setTextColor(107, 114, 128);
      this.pdf.text('Scan QR code to view on BaseScan', this.margin + qrSize + 10, this.currentY + 22);
      
      this.currentY += qrSize;
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      // Continue without QR code
      this.pdf.setTextColor(107, 114, 128);
      this.pdf.setFontSize(10);
      this.pdf.text(`Transaction Hash: ${this.data.blockchainTxHash}`, this.margin, this.currentY);
      this.currentY += 8;
    }
  }

  private addFooter(): void {
    // Move to bottom of page
    this.currentY = this.pageHeight - 40;
    
    // Support section
    this.pdf.setFillColor(249, 250, 251);
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 25, 3, 3, 'F');
    
    this.pdf.setTextColor(31, 41, 55);
    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Need Help?', this.margin + 10, this.currentY + 8);
    
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(107, 114, 128);
    this.pdf.text(`Email: ${this.data.supportEmail}`, this.margin + 10, this.currentY + 15);
    this.pdf.text(`Visit: ${this.data.supportUrl}`, this.margin + 10, this.currentY + 20);
    
    // Base branding with logo simulation
    const baseX = this.pageWidth - this.margin - 60;
    
    // Simulate Base logo (blue circle with white "b")
    this.pdf.setFillColor(0, 82, 255); // Base Blue
    this.pdf.circle(baseX, this.currentY + 15, 6, 'F');
    
    // Add "b" in the center of circle
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('b', baseX - 2, this.currentY + 17);
    
    // "Built on Base" text
    this.pdf.setTextColor(0, 82, 255); // Base Blue
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Built on Base', baseX + 10, this.currentY + 17);
    
    // Disclaimer
    this.currentY += 30;
    this.pdf.setTextColor(107, 114, 128);
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'normal');
    const disclaimer = 'This receipt is proof of your cryptocurrency transaction. Keep this record for your financial records.';
    const disclaimerLines = this.pdf.splitTextToSize(disclaimer, this.contentWidth);
    this.pdf.text(disclaimerLines, this.margin, this.currentY);
  }

  private addSectionHeader(title: string): void {
    this.currentY += 5;
    this.pdf.setTextColor(31, 41, 55);
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(title, this.margin, this.currentY);
    
    // Underline with brand color
    this.pdf.setDrawColor(124, 101, 193); // Farcaster Purple
    this.pdf.setLineWidth(0.5);
    this.pdf.line(this.margin, this.currentY + 2, this.margin + this.pdf.getTextWidth(title), this.currentY + 2);
    
    this.currentY += 8;
  }

  private addDetailsTable(details: [string, string][]): void {
    const rowHeight = 6;
    
    details.forEach(([label, value], index) => {
      // Alternate row background
      if (index % 2 === 0) {
        this.pdf.setFillColor(249, 250, 251);
        this.pdf.rect(this.margin, this.currentY - 1, this.contentWidth, rowHeight, 'F');
      }
      
      // Label
      this.pdf.setTextColor(107, 114, 128);
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(label, this.margin + 5, this.currentY + 3);
      
      // Value
      this.pdf.setTextColor(31, 41, 55);
      this.pdf.setFont('helvetica', 'bold');
      const valueWidth = this.pdf.getTextWidth(value);
      this.pdf.text(value, this.pageWidth - this.margin - valueWidth - 5, this.currentY + 3);
      
      this.currentY += rowHeight;
    });
  }

  private addSpacing(spacing: number): void {
    this.currentY += spacing;
  }

  private formatCurrency(amount: number): string {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private truncateAddress(address: string): string {
    if (address.length <= 20) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  }
}

// Helper function to create receipt from order data
export function createReceiptFromOrder(orderData: OrderData): ReceiptData {
  const now = new Date().toISOString();
  const receiptNumber = `MSR${Date.now().toString().slice(-8)}`;
  
  return {
    transactionId: orderData.id || orderData.paycrest_order_id || `TXN${Date.now()}`,
    paycrestOrderId: orderData.paycrest_order_id || orderData.id,
    date: orderData.created_at || now,
    status: orderData.status || 'completed',
    
    usdcAmount: orderData.amount_in_usdc || parseFloat(orderData.amount || '0'),
    localAmount: orderData.amount_in_local || 0,
    localCurrency: orderData.local_currency || orderData.currency,
    exchangeRate: orderData.rate || 0,
    
    senderFee: orderData.sender_fee || 0,
    transactionFee: orderData.transaction_fee || 0,
    totalFees: (orderData.sender_fee || 0) + (orderData.transaction_fee || 0),
    netAmount: (orderData.amount_in_local || 0) - ((orderData.sender_fee || 0) + (orderData.transaction_fee || 0)),
    
    recipientName: orderData.account_name || orderData.accountName || 'Unknown',
    recipientContact: orderData.local_currency === 'KES' ? 
      (orderData.phone_number || orderData.phoneNumber || 'Unknown') : 
      (orderData.account_number || orderData.accountNumber || 'Unknown'),
    recipientBank: orderData.bank_name || undefined,
    recipientBankCode: orderData.bank_code || orderData.bankCode || undefined,
    
    senderWallet: orderData.wallet_address || orderData.returnAddress || '',
    
    network: 'base',
    token: 'USDC',
    blockchainTxHash: orderData.blockchain_tx_hash || orderData.transactionHash,
    
    receiptNumber,
    supportEmail: 'support@minisend.xyz',
    supportUrl: 'https://minisend.xyz/support',
  };
}

// Main export function
export async function generateReceiptPDF(orderData: OrderData, options?: ReceiptGenerationOptions): Promise<Blob> {
  const receiptData = createReceiptFromOrder(orderData);
  const generator = new ReceiptGenerator(receiptData, options);
  return await generator.generatePDF();
}