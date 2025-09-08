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
    // Set clean background
    this.pdf.setFillColor(248, 250, 252);
    this.pdf.rect(0, 0, this.pageWidth, this.pageHeight, 'F');
    
    // Initialize font settings
    this.setupFontStyling();
    
    // Header section
    await this.addPreviewStyleHeader();
    
    // Transaction summary card
    this.addPreviewStyleTransactionCard();
    
    // Payment details
    this.addPreviewStylePaymentDetails();
    
    // Fee breakdown (only if fees exist)
    this.addPreviewStyleFeeBreakdown();
    
    // Net amount received
    this.addPreviewStyleNetAmount();
    
    // Footer
    await this.addPreviewStyleFooter();
    
    return this.pdf.output('blob');
  }

  private setupFontStyling(): void {
    // Use helvetica for clean, modern appearance
    // Optimized for high readability and professional presentation
    this.pdf.setFont('helvetica');
    
    // Set default text properties for consistency
    this.pdf.setTextColor(17, 24, 39); // Default dark gray
    this.pdf.setFontSize(10); // Default readable size
  }

  // Fixed header section with proper spacing
  private async addPreviewStyleHeader(): Promise<void> {
    const headerHeight = 60;
    
    // Clean white background
    this.pdf.setFillColor(255, 255, 255);
    this.pdf.rect(this.margin, this.currentY, this.contentWidth, headerHeight, 'F');
    
    // Subtle bottom border
    this.pdf.setDrawColor(229, 231, 235);
    this.pdf.setLineWidth(1);
    this.pdf.line(this.margin, this.currentY + headerHeight, this.margin + this.contentWidth, this.currentY + headerHeight);
    
    // Left side - Logo area
    const logoX = this.margin + 10;
    const logoY = this.currentY + 15;
    const logoSize = 18;
    
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
          
          this.pdf.addImage(logoDataUrl, 'PNG', logoX, logoY, logoSize, logoSize);
          resolve(true);
        };
        logoImg.onerror = () => {
          // Fallback logo
          this.pdf.setFillColor(168, 85, 247);
          this.pdf.roundedRect(logoX, logoY, logoSize, logoSize, 3, 3, 'F');
          this.pdf.setTextColor(255, 255, 255);
          this.pdf.setFontSize(10);
          this.pdf.setFont('helvetica', 'bold');
          this.pdf.text('M', logoX + 7, logoY + 12);
          resolve(true);
        };
      });
    } catch {
      // Fallback logo
      this.pdf.setFillColor(168, 85, 247);
      this.pdf.roundedRect(logoX, logoY, logoSize, logoSize, 3, 3, 'F');
      this.pdf.setTextColor(255, 255, 255);
      this.pdf.setFontSize(10);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('M', logoX + 7, logoY + 12);
    }
    
    // Company name - positioned after logo with spacing
    const companyX = logoX + logoSize + 10;
    this.pdf.setTextColor(17, 24, 39);
    this.pdf.setFontSize(22);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Minisend', companyX, this.currentY + 28);
    
    // Tagline - positioned below company name
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(100, 116, 139);
    this.pdf.text('Instant USDC to Mobile Money', companyX, this.currentY + 38);
    
    // Right side - Receipt info
    const rightAreaX = this.pageWidth - this.margin - 70;
    
    this.pdf.setTextColor(17, 24, 39);
    this.pdf.setFontSize(16);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('RECEIPT', rightAreaX, this.currentY + 22);
    
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(100, 116, 139);
    this.pdf.text(`#${this.data.receiptNumber}`, rightAreaX, this.currentY + 32);
    this.pdf.text(this.formatDate(this.data.date), rightAreaX, this.currentY + 42);
    
    this.currentY += headerHeight + 10;
  }

  // Fixed transaction card with proper spacing
  private addPreviewStyleTransactionCard(): void {
    const cardHeight = 65;
    const cardPadding = 15;
    
    // Card background
    this.pdf.setFillColor(249, 250, 251);
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, cardHeight, 6, 6, 'F');
    
    // Card border
    this.pdf.setDrawColor(229, 231, 235);
    this.pdf.setLineWidth(1);
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, cardHeight, 6, 6, 'S');
    
    // Define column positions
    const leftColX = this.margin + cardPadding;
    const rightColX = this.margin + (this.contentWidth * 0.6);
    const cardY = this.currentY;
    
    // Left column - Amount section
    this.pdf.setTextColor(100, 116, 139);
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('AMOUNT SENT', leftColX, cardY + 18);
    
    // Large amount - positioned with proper spacing
    this.pdf.setFontSize(20);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(17, 24, 39);
    const amountText = `${this.formatCurrency(this.data.localAmount)} ${this.data.localCurrency}`;
    this.pdf.text(amountText, leftColX, cardY + 35);
    
    // USDC equivalent - positioned below amount
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(100, 116, 139);
    this.pdf.setFont('helvetica', 'normal');
    const usdcText = `≈ $${this.data.usdcAmount.toFixed(4)} USDC`;
    this.pdf.text(usdcText, leftColX, cardY + 48);
    
    // Right column - Recipient section
    this.pdf.setTextColor(100, 116, 139);
    this.pdf.setFontSize(10);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('RECIPIENT', rightColX, cardY + 18);
    
    // Recipient name - positioned with proper spacing
    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(168, 85, 247);
    const recipientName = this.data.recipientName;
    const maxNameLength = 20;
    const displayName = recipientName.length > maxNameLength ? 
      recipientName.substring(0, maxNameLength) + '...' : recipientName;
    this.pdf.text(displayName, rightColX, cardY + 32);
    
    // Contact info - positioned below name
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(75, 85, 99);
    this.pdf.setFont('helvetica', 'normal');
    const contactText = this.data.localCurrency === 'KES' ? 
      this.data.recipientContact : 
      `***${this.data.recipientContact.slice(-4)}`;
    this.pdf.text(contactText, rightColX, cardY + 45);
    
    this.currentY += cardHeight + 15;
  }

  // Fixed payment details section with proper spacing
  private addPreviewStylePaymentDetails(): void {
    // Section header
    this.pdf.setTextColor(17, 24, 39);
    this.pdf.setFontSize(14);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('TRANSACTION DETAILS', this.margin, this.currentY);
    this.currentY += 20;
    
    // Details card with proper height
    const cardHeight = 55;
    const cardPadding = 12;
    
    this.pdf.setFillColor(255, 255, 255);
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, cardHeight, 4, 4, 'F');
    this.pdf.setDrawColor(229, 231, 235);
    this.pdf.setLineWidth(1);
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, cardHeight, 4, 4, 'S');
    
    // Define column positions with proper spacing
    const leftCol = this.margin + cardPadding;
    const rightCol = this.margin + (this.contentWidth * 0.52);
    const cardY = this.currentY;
    
    // Row 1: Exchange Rate and Network
    let rowY = cardY + 15;
    
    // Exchange Rate - Left column
    this.pdf.setTextColor(100, 116, 139);
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Exchange Rate', leftCol, rowY);
    
    this.pdf.setTextColor(17, 24, 39);
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(`1 USDC = ${this.data.exchangeRate.toFixed(2)} ${this.data.localCurrency}`, leftCol, rowY + 10);
    
    // Network - Right column
    this.pdf.setTextColor(100, 116, 139);
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Network', rightCol, rowY);
    
    this.pdf.setTextColor(17, 24, 39);
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Base Network', rightCol, rowY + 10);
    
    // Row 2: Token and From
    rowY += 25;
    
    // Token - Left column
    this.pdf.setTextColor(100, 116, 139);
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Token', leftCol, rowY);
    
    this.pdf.setTextColor(17, 24, 39);
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('USD Coin (USDC)', leftCol, rowY + 10);
    
    // From - Right column
    this.pdf.setTextColor(100, 116, 139);
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('From', rightCol, rowY);
    
    this.pdf.setTextColor(17, 24, 39);
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(this.truncateAddress(this.data.senderWallet), rightCol, rowY + 10);
    
    this.currentY += cardHeight + 15;
  }

  // Simplified, clean fee breakdown
  private addPreviewStyleFeeBreakdown(): void {
    // Only show if there are actual fees
    if (this.data.totalFees > 0) {
      // Section header
      this.pdf.setTextColor(17, 24, 39);
      this.pdf.setFontSize(16);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('FEES', this.margin, this.currentY);
      this.currentY += 18;
      
      // Clean fee card
      this.pdf.setFillColor(254, 242, 242); // Very light red background for fees
      this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 25, 4, 4, 'F');
      this.pdf.setDrawColor(252, 165, 165);
      this.pdf.setLineWidth(1);
      this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, 25, 4, 4, 'S');
      
      // Fee content
      this.pdf.setTextColor(127, 29, 29);
      this.pdf.setFontSize(12);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text('Network + Service Fee', this.margin + 15, this.currentY + 12);
      
      const totalFeesText = `$${this.data.totalFees.toFixed(4)} USDC`;
      const totalFeesWidth = this.pdf.getTextWidth(totalFeesText);
      this.pdf.text(totalFeesText, this.pageWidth - this.margin - totalFeesWidth - 15, this.currentY + 12);
      
      this.pdf.setFontSize(9);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(153, 27, 27);
      this.pdf.text('Includes blockchain and processing fees', this.margin + 15, this.currentY + 20);
      
      this.currentY += 40;
    } else {
      this.currentY += 10;
    }
  }

  // Fixed net amount section with proper spacing
  private addPreviewStyleNetAmount(): void {
    const sectionHeight = 35;
    const sectionPadding = 15;
    
    // Success green background
    this.pdf.setFillColor(240, 253, 244);
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, sectionHeight, 6, 6, 'F');
    this.pdf.setDrawColor(34, 197, 94);
    this.pdf.setLineWidth(2);
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, sectionHeight, 6, 6, 'S');
    
    const sectionY = this.currentY;
    
    // Success indicator circle
    this.pdf.setFillColor(34, 197, 94);
    this.pdf.circle(this.margin + 20, sectionY + 17, 4, 'F');
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('✓', this.margin + 18, sectionY + 20);
    
    // Text content with proper positioning
    this.pdf.setTextColor(21, 128, 61);
    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('RECIPIENT RECEIVED', this.margin + 35, sectionY + 14);
    
    // Amount on the right side
    const netAmountText = `${this.formatCurrency(this.data.netAmount)} ${this.data.localCurrency}`;
    const netAmountWidth = this.pdf.getTextWidth(netAmountText);
    this.pdf.setFontSize(14);
    this.pdf.text(netAmountText, this.pageWidth - this.margin - netAmountWidth - sectionPadding, sectionY + 22);
    
    this.currentY += sectionHeight + 15;
  }

  // Fixed footer section with proper positioning
  private async addPreviewStyleFooter(): Promise<void> {
    // Ensure we have enough space at bottom
    const footerHeight = 50;
    const disclaimerHeight = 15;
    const totalBottomSpace = footerHeight + disclaimerHeight;
    
    // Position footer with proper spacing from last element
    this.currentY = Math.max(this.currentY + 20, this.pageHeight - totalBottomSpace - 20);
    
    // Footer card background
    this.pdf.setFillColor(250, 250, 250);
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, footerHeight, 6, 6, 'F');
    this.pdf.setDrawColor(229, 231, 235);
    this.pdf.setLineWidth(1);
    this.pdf.roundedRect(this.margin, this.currentY, this.contentWidth, footerHeight, 6, 6, 'S');
    
    const footerY = this.currentY;
    const footerPadding = 15;
    
    // Left side - Support section
    const leftX = this.margin + footerPadding;
    this.pdf.setTextColor(17, 24, 39);
    this.pdf.setFontSize(11);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Need Help?', leftX, footerY + 15);
    
    this.pdf.setFontSize(8);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(100, 116, 139);
    this.pdf.text('support@minisend.xyz', leftX, footerY + 26);
    this.pdf.text('minisend.xyz/support', leftX, footerY + 36);
    
    // Right side - Base branding
    const rightX = this.margin + this.contentWidth - 80;
    
    // "Built on" text
    this.pdf.setTextColor(100, 116, 139);
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Built on', rightX, footerY + 20);
    
    // Base logo positioning
    const logoX = rightX + 25;
    const logoY = footerY + 14;
    
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
            canvas.width = 120;
            canvas.height = 30;
            ctx!.drawImage(baseLogoImg, 0, 0, 120, 30);
            const baseLogoDataUrl = canvas.toDataURL('image/png');
            
            this.pdf.addImage(baseLogoDataUrl, 'PNG', logoX, logoY, 30, 8);
            
            URL.revokeObjectURL(svgUrl);
            resolve(true);
          };
          baseLogoImg.onerror = () => {
            URL.revokeObjectURL(svgUrl);
            this.addBaseFallback(logoX, logoY);
            resolve(false);
          };
        });
      } else {
        this.addBaseFallback(logoX, logoY);
      }
    } catch {
      this.addBaseFallback(logoX, logoY);
    }
    
    // Bottom disclaimer - positioned below footer
    this.currentY = footerY + footerHeight + 10;
    this.pdf.setTextColor(156, 163, 175);
    this.pdf.setFontSize(7);
    this.pdf.setFont('helvetica', 'normal');
    const disclaimer = 'This receipt serves as proof of your cryptocurrency transaction. Please retain for your records.';
    const disclaimerLines = this.pdf.splitTextToSize(disclaimer, this.contentWidth - 20);
    this.pdf.text(disclaimerLines, this.margin + 10, this.currentY);
  }
  
  private addBaseFallback(x: number, y: number): void {
    this.pdf.setFillColor(0, 82, 255);
    this.pdf.roundedRect(x, y + 2, 30, 6, 2, 2, 'F');
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFontSize(6);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('BASE', x + 8, y + 6);
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