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
    
    // Header Section (exactly like preview)
    await this.addPreviewStyleHeader();
    this.addSpacing(10);
    
    // Transaction Summary Card (exactly like preview)
    this.addPreviewStyleTransactionCard();
    this.addSpacing(15);
    
    // Payment Details Section (exactly like preview)
    this.addPreviewStylePaymentDetails();
    this.addSpacing(15);
    
    // Fee Breakdown Section (exactly like preview)
    this.addPreviewStyleFeeBreakdown();
    this.addSpacing(15);
    
    // Net Amount Section (exactly like preview)
    this.addPreviewStyleNetAmount();
    this.addSpacing(20);
    
    // Footer (exactly like preview)
    await this.addPreviewStyleFooter();
    
    return this.pdf.output('blob');
  }

  private setupFontStyling(): void {
    // Use helvetica as base, configured to match Plus Jakarta Sans characteristics
    // Plus Jakarta Sans is a geometric sans-serif with clean lines and good readability
    this.pdf.setFont('helvetica');
    
    // Set character spacing to match Plus Jakarta Sans's slightly wider character spacing
    // Note: jsPDF doesn't support character spacing directly, but we can adjust sizing accordingly
  }

  // New preview-style header matching the preview page exactly
  private async addPreviewStyleHeader(): Promise<void> {
    // White background with subtle border
    this.pdf.setFillColor(255, 255, 255);
    this.pdf.rect(this.margin, this.currentY, this.contentWidth, 40, 'F');
    
    // Bottom border
    this.pdf.setDrawColor(226, 232, 240);
    this.pdf.setLineWidth(0.5);
    this.pdf.line(this.margin, this.currentY + 40, this.margin + this.contentWidth, this.currentY + 40);
    
    // Left side - Logo and company info
    try {
      const logoImg = new Image();
      logoImg.src = '/minisend-logo.png';
      
      await new Promise((resolve) => {
        logoImg.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = logoImg.width;
          canvas.height = logoImg.height;
          ctx!.drawImage(logoImg, 0, 0);
          const logoDataUrl = canvas.toDataURL('image/png');
          
          // Logo - smaller size like preview
          this.pdf.addImage(logoDataUrl, 'PNG', this.margin + 5, this.currentY + 10, 15, 12);
          resolve(true);
        };
        logoImg.onerror = () => {
          // Fallback: Simple 'M' in rectangle
          this.pdf.setFillColor(59, 130, 246);
          this.pdf.roundedRect(this.margin + 5, this.currentY + 10, 15, 12, 2, 2, 'F');
          this.pdf.setTextColor(255, 255, 255);
          this.pdf.setFontSize(10);
          this.pdf.setFont('helvetica', 'bold');
          this.pdf.text('M', this.margin + 11, this.currentY + 18);
          resolve(true);
        };
      });
    } catch {
      // Simple fallback
      this.pdf.setFillColor(59, 130, 246);
      this.pdf.roundedRect(this.margin + 5, this.currentY + 10, 15, 12, 2, 2, 'F');
      this.pdf.setTextColor(255, 255, 255);
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('M', this.margin + 11, this.currentY + 18);
    }
    
    // Company name
    this.pdf.setTextColor(31, 41, 55);
    this.pdf.setFontSize(24);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Minisend', this.margin + 25, this.currentY + 20);
    
    // Tagline
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(107, 114, 128);
    this.pdf.text('USDC to Mobile Money', this.margin + 25, this.currentY + 28);
    
    // Right side - Receipt info
    this.pdf.setTextColor(31, 41, 55);
    this.pdf.setFontSize(18);
    this.pdf.setFont('helvetica', 'bold');
    const receiptText = 'RECEIPT';
    const receiptWidth = this.pdf.getTextWidth(receiptText);
    this.pdf.text(receiptText, this.pageWidth - this.margin - receiptWidth - 5, this.currentY + 15);
    
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(107, 114, 128);
    const receiptNumber = `#${this.data.receiptNumber}`;
    const receiptNumWidth = this.pdf.getTextWidth(receiptNumber);
    this.pdf.text(receiptNumber, this.pageWidth - this.margin - receiptNumWidth - 5, this.currentY + 23);
    
    const dateText = this.formatDate(this.data.date);
    const dateWidth = this.pdf.getTextWidth(dateText);
    this.pdf.text(dateText, this.pageWidth - this.margin - dateWidth - 5, this.currentY + 31);
    
    this.currentY += 50;
  }

  // Transaction summary card exactly like preview page
  private addPreviewStyleTransactionCard(): void {
    // White card with border
    this.pdf.setFillColor(255, 255, 255);
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 45, 4, 4, 'F');
    this.pdf.setDrawColor(226, 232, 240);
    this.pdf.setLineWidth(1);
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 45, 4, 4, 'S');
    
    // Left side - Amount Sent
    this.pdf.setTextColor(107, 114, 128);
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Amount Sent', this.margin + 15, this.currentY + 15);
    
    // Large amount
    this.pdf.setFontSize(24);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(31, 41, 55);
    const amountText = `${this.formatCurrency(this.data.localAmount)} ${this.data.localCurrency}`;
    this.pdf.text(amountText, this.margin + 15, this.currentY + 28);
    
    // USDC equivalent with ~ sign
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(31, 41, 55);
    this.pdf.setFont('helvetica', 'bold');
    const usdcText = `~ $${this.data.usdcAmount.toFixed(4)} USDC`;
    this.pdf.text(usdcText, this.margin + 15, this.currentY + 38);
    
    // Right side - Sent To
    const rightX = this.margin + this.contentWidth - 90;
    this.pdf.setTextColor(107, 114, 128);
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Sent To', rightX, this.currentY + 15);
    
    // Recipient name in blue
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(37, 99, 235);
    const recipientName = this.data.recipientName;
    if (recipientName.length > 15) {
      this.pdf.text(recipientName.substring(0, 15) + '...', rightX, this.currentY + 26);
    } else {
      this.pdf.text(recipientName, rightX, this.currentY + 26);
    }
    
    // Mobile/Account number - bold
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(31, 41, 55);
    this.pdf.setFont('helvetica', 'bold');
    const contactText = this.data.localCurrency === 'KES' ? 
      `Mobile: ${this.data.recipientContact}` : 
      `Account: ${this.data.recipientContact}`;
    this.pdf.text(contactText, rightX, this.currentY + 36);
    
    this.currentY += 55;
  }

  // Payment Details section exactly like preview page
  private addPreviewStylePaymentDetails(): void {
    // Section header
    this.pdf.setTextColor(31, 41, 55);
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Payment Details', this.margin, this.currentY);
    this.currentY += 10;
    
    // Grid layout - 2 columns like preview
    const leftCol = this.margin;
    const rightCol = this.margin + (this.contentWidth / 2);
    const rowHeight = 8;
    
    // Row 1: Exchange Rate | Network
    this.pdf.setTextColor(107, 114, 128);
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Exchange Rate:', leftCol, this.currentY);
    this.pdf.setTextColor(31, 41, 55);
    this.pdf.text(`1 USDC = ${this.data.exchangeRate.toFixed(2)} ${this.data.localCurrency}`, leftCol + 32, this.currentY);
    
    this.pdf.setTextColor(107, 114, 128);
    this.pdf.text('Network:', rightCol, this.currentY);
    this.pdf.setTextColor(31, 41, 55);
    this.pdf.text('Base (Ethereum L2)', rightCol + 22, this.currentY);
    this.currentY += rowHeight;
    
    // Row 2: Token | Sender Wallet
    this.pdf.setTextColor(107, 114, 128);
    this.pdf.text('Token:', leftCol, this.currentY);
    this.pdf.setTextColor(31, 41, 55);
    this.pdf.text('USDC', leftCol + 18, this.currentY);
    
    this.pdf.setTextColor(107, 114, 128);
    this.pdf.text('Sender Wallet:', rightCol, this.currentY);
    this.pdf.setTextColor(31, 41, 55);
    this.pdf.text(this.truncateAddress(this.data.senderWallet), rightCol + 37, this.currentY);
    
    this.currentY += 15;
  }

  // Fee Breakdown section exactly like preview page
  private addPreviewStyleFeeBreakdown(): void {
    // Section header
    this.pdf.setTextColor(31, 41, 55);
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Fee Breakdown', this.margin, this.currentY);
    this.currentY += 10;
    
    const rowHeight = 6;
    
    // Fee rows
    this.pdf.setFontSize(10);
    
    // Sender Fee
    this.pdf.setTextColor(107, 114, 128);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Sender Fee:', this.margin, this.currentY);
    this.pdf.setTextColor(31, 41, 55);
    const senderFeeText = `$${this.data.senderFee.toFixed(4)} USDC`;
    const senderFeeWidth = this.pdf.getTextWidth(senderFeeText);
    this.pdf.text(senderFeeText, this.pageWidth - this.margin - senderFeeWidth, this.currentY);
    this.currentY += rowHeight;
    
    // Transaction Fee
    this.pdf.setTextColor(107, 114, 128);
    this.pdf.text('Transaction Fee:', this.margin, this.currentY);
    this.pdf.setTextColor(31, 41, 55);
    const txFeeText = `$${this.data.transactionFee.toFixed(4)} USDC`;
    const txFeeWidth = this.pdf.getTextWidth(txFeeText);
    this.pdf.text(txFeeText, this.pageWidth - this.margin - txFeeWidth, this.currentY);
    this.currentY += rowHeight + 2;
    
    // Total Fees with border
    this.pdf.setDrawColor(226, 232, 240);
    this.pdf.setLineWidth(0.5);
    this.pdf.line(this.margin, this.currentY - 1, this.pageWidth - this.margin, this.currentY - 1);
    
    this.pdf.setTextColor(107, 114, 128);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Total Fees:', this.margin, this.currentY + 4);
    this.pdf.setTextColor(31, 41, 55);
    const totalFeesText = `$${this.data.totalFees.toFixed(4)} USDC`;
    const totalFeesWidth = this.pdf.getTextWidth(totalFeesText);
    this.pdf.text(totalFeesText, this.pageWidth - this.margin - totalFeesWidth, this.currentY + 4);
    
    this.currentY += 15;
  }

  // Net Amount section exactly like preview page
  private addPreviewStyleNetAmount(): void {
    // Light gray background with border
    this.pdf.setFillColor(248, 250, 252);
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 15, 3, 3, 'F');
    this.pdf.setDrawColor(226, 232, 240);
    this.pdf.setLineWidth(0.5);
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 15, 3, 3, 'S');
    
    // Text
    this.pdf.setTextColor(31, 41, 55);
    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Net Amount Received by Recipient:', this.margin + 10, this.currentY + 10);
    
    const netAmountText = `${this.formatCurrency(this.data.netAmount)} ${this.data.localCurrency}`;
    const netAmountWidth = this.pdf.getTextWidth(netAmountText);
    this.pdf.text(netAmountText, this.pageWidth - this.margin - netAmountWidth - 10, this.currentY + 10);
    
    this.currentY += 25;
  }

  // Footer exactly like preview page
  private async addPreviewStyleFooter(): Promise<void> {
    // Move to bottom area
    this.currentY = this.pageHeight - 50;
    
    // White background with border
    this.pdf.setFillColor(255, 255, 255);
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 30, 3, 3, 'F');
    this.pdf.setDrawColor(226, 232, 240);
    this.pdf.setLineWidth(0.5);
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 30, 3, 3, 'S');
    
    // Left side - Help section
    this.pdf.setTextColor(31, 41, 55);
    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Need Help?', this.margin + 10, this.currentY + 12);
    
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(107, 114, 128);
    this.pdf.text(`Email: ${this.data.supportEmail}`, this.margin + 10, this.currentY + 20);
    this.pdf.text(`Visit: ${this.data.supportUrl}`, this.margin + 10, this.currentY + 26);
    
    // Right side - Base logo with "Built on" text positioned correctly
    const rightAreaX = this.pageWidth - this.margin - 90;
    
    // "Built on" text first
    this.pdf.setTextColor(107, 114, 128);
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Built on', rightAreaX, this.currentY + 18);
    
    // Base logo next to "Built on" - closer spacing
    const logoX = rightAreaX + 18;
    
    try {
      const svgResponse = await fetch('/Base_lockup_2color.svg');
      if (svgResponse.ok) {
        const svgText = await svgResponse.text();
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
        const svgUrl = URL.createObjectURL(svgBlob);
        
        const baseLogoImg = new Image();
        baseLogoImg.src = svgUrl;
        
        await new Promise((resolve) => {
          baseLogoImg.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 80;
            canvas.height = 20;
            ctx!.drawImage(baseLogoImg, 0, 0, 80, 20);
            const baseLogoDataUrl = canvas.toDataURL('image/png');
            
            // Add smaller Base logo
            this.pdf.addImage(baseLogoDataUrl, 'PNG', logoX, this.currentY + 12, 20, 5);
            
            URL.revokeObjectURL(svgUrl);
            resolve(true);
          };
          baseLogoImg.onerror = () => {
            URL.revokeObjectURL(svgUrl);
            resolve(false);
          };
        });
      } else {
        throw new Error('Failed to fetch SVG');
      }
    } catch {
      // Fallback silently
      // Fallback: Blue rectangle with "base" text - smaller size
      this.pdf.setFillColor(0, 82, 255);
      this.pdf.roundedRect(logoX, this.currentY + 14, 20, 6, 1, 1, 'F');
      
      this.pdf.setTextColor(255, 255, 255);
      this.pdf.setFontSize(6);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('base', logoX + 5, this.currentY + 18);
    }
  }

  private addTransactionSummary(): void {
    // Transaction summary card - exactly like preview page
    this.pdf.setFillColor(255, 255, 255); // White background
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 45, 4, 4, 'F');
    
    // Border exactly like preview
    this.pdf.setDrawColor(226, 232, 240); // Light gray border
    this.pdf.setLineWidth(1);
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 45, 4, 4, 'S');
    
    // Left side - Amount sent (exactly like preview)
    this.pdf.setTextColor(107, 114, 128); // Gray text
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Amount Sent', this.margin + 15, this.currentY + 15);
    
    // Large amount text - exactly like preview
    this.pdf.setFontSize(24);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(31, 41, 55); // Dark gray for amount
    const amountText = `${this.formatCurrency(this.data.localAmount)} ${this.data.localCurrency}`;
    this.pdf.text(amountText, this.margin + 15, this.currentY + 28);
    
    // USDC equivalent - bold like preview
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(31, 41, 55); // Dark gray
    this.pdf.setFont('helvetica', 'bold'); // Make USDC amount bold
    const usdcText = `≈ $${this.data.usdcAmount.toFixed(4)} USDC`;
    this.pdf.text(usdcText, this.margin + 15, this.currentY + 38);
    
    // Right side - Recipient (exactly like preview)
    const rightX = this.margin + this.contentWidth - 90;
    
    // "Sent To" label
    this.pdf.setTextColor(107, 114, 128); // Gray text like preview
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Sent To', rightX, this.currentY + 15);
    
    // Recipient name - blue color like preview
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(37, 99, 235); // Blue color like preview
    
    const recipientName = this.data.recipientName;
    if (recipientName.length > 15) {
      this.pdf.text(recipientName.substring(0, 15) + '...', rightX, this.currentY + 26);
    } else {
      this.pdf.text(recipientName, rightX, this.currentY + 26);
    }
    
    // Mobile/Account number - bold black like preview
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(31, 41, 55); // Dark gray
    this.pdf.setFont('helvetica', 'bold'); // Bold like preview
    const contactText = this.data.localCurrency === 'KES' ? 
      `Mobile: ${this.data.recipientContact}` : 
      `Account: ${this.data.recipientContact}`;
    this.pdf.text(contactText, rightX, this.currentY + 36);
    
    this.currentY += 55;
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
    
    // Net amount received box - clean white with border
    this.pdf.setFillColor(248, 250, 252); // Very light gray background
    this.pdf.roundedRect(this.margin, this.currentY + 5, this.contentWidth, 15, 3, 3, 'F');
    
    // Add border
    this.pdf.setDrawColor(226, 232, 240); // Light gray border
    this.pdf.setLineWidth(0.5);
    this.pdf.roundedRect(this.margin, this.currentY + 5, this.contentWidth, 15, 3, 3, 'S');
    
    this.pdf.setTextColor(31, 41, 55); // Dark text for good contrast
    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Net Amount Received by Recipient:', this.margin + 10, this.currentY + 14);
    
    this.pdf.setTextColor(31, 41, 55); // Dark text for amount
    this.pdf.setFont('helvetica', 'bold');
    const netAmount = `${this.formatCurrency(this.data.netAmount)} ${this.data.localCurrency}`;
    const netWidth = this.pdf.getTextWidth(netAmount);
    this.pdf.text(netAmount, this.pageWidth - this.margin - netWidth - 10, this.currentY + 14);
    
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
    } catch {
      // Continue without QR code
      // Continue without QR code
      this.pdf.setTextColor(107, 114, 128);
      this.pdf.setFontSize(10);
      this.pdf.text(`Transaction Hash: ${this.data.blockchainTxHash}`, this.margin, this.currentY);
      this.currentY += 8;
    }
  }

  private async addFooter(): Promise<void> {
    // Move to bottom of page
    this.currentY = this.pageHeight - 40;
    
    // Support section - clean white background
    this.pdf.setFillColor(255, 255, 255); // White background
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 25, 3, 3, 'F');
    
    // Subtle border
    this.pdf.setDrawColor(226, 232, 240); // Light gray border
    this.pdf.setLineWidth(0.5);
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 25, 3, 3, 'S');
    
    this.pdf.setTextColor(31, 41, 55); // Dark text
    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Need Help?', this.margin + 10, this.currentY + 8);
    
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(107, 114, 128); // Gray text
    this.pdf.text(`Email: ${this.data.supportEmail}`, this.margin + 10, this.currentY + 15);
    this.pdf.text(`Visit: ${this.data.supportUrl}`, this.margin + 10, this.currentY + 20);
    
    // Base branding with actual logo from your project - exactly like preview
    const baseX = this.pageWidth - this.margin - 80;
    
    try {
      // For SVG files, we need to fetch and convert them differently
      const svgResponse = await fetch('/Base_lockup_2color.svg');
      if (svgResponse.ok) {
        const svgText = await svgResponse.text();
        
        // Create a blob URL from the SVG
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
        const svgUrl = URL.createObjectURL(svgBlob);
        
        const baseLogoImg = new Image();
        baseLogoImg.src = svgUrl;
        
        await new Promise((resolve) => {
          baseLogoImg.onload = () => {
            // Convert SVG to canvas and then to base64
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 120;
            canvas.height = 30;
            ctx!.drawImage(baseLogoImg, 0, 0, 120, 30);
            const baseLogoDataUrl = canvas.toDataURL('image/png');
            
            // Add Base logo to PDF
            this.pdf.addImage(baseLogoDataUrl, 'PNG', baseX, this.currentY + 10, 30, 8);
            
            // Clean up blob URL
            URL.revokeObjectURL(svgUrl);
            resolve(true);
          };
          baseLogoImg.onerror = () => {
            URL.revokeObjectURL(svgUrl);
            resolve(false);
          };
        });
      } else {
        throw new Error('Failed to fetch SVG');
      }
    } catch {
      // Fallback silently
      // Fallback: Create Base logo exactly like preview - blue square with "base" text
      this.pdf.setFillColor(0, 82, 255); // Base Blue
      this.pdf.roundedRect(baseX, this.currentY + 12, 24, 8, 1, 1, 'F');
      
      // Add "base" text in white
      this.pdf.setTextColor(255, 255, 255); // White text
      this.pdf.setFontSize(7);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('base', baseX + 6, this.currentY + 17);
      
      // Add "Built on" text next to logo
      this.pdf.setTextColor(107, 114, 128); // Gray text like preview
      this.pdf.setFontSize(9);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text('Built on', baseX + 28, this.currentY + 16);
    }
    
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