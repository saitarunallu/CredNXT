import { Offer, User } from "@shared/firestore-schema";
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { admin } from '../firebase-config';
import { calculateRepaymentSchedule, PaymentScheduleItem } from "@shared/calculations";

export class PdfService {
  private contractsDir = path.join(process.cwd(), 'contracts');
  private kfsDir = path.join(process.cwd(), 'kfs');
  private schedulesDir = path.join(process.cwd(), 'schedules');
  private bucket: any;
  private useCloudStorage: boolean;
  private bucketInitialized: boolean = false;

  constructor() {
    // Determine if we're in a cloud environment
    this.useCloudStorage = process.env.NODE_ENV === 'production' || 
                          !!process.env.FIREBASE_CONFIG_JSON || 
                          process.env.FUNCTIONS_EMULATOR !== 'true';
    
    console.log(`📁 PDF Service: Storage mode - ${this.useCloudStorage ? 'Cloud (Firebase Storage)' : 'Local'}`);
    
    // For local development or fallback, ensure directories exist
    if (!this.useCloudStorage) {
      if (!fs.existsSync(this.contractsDir)) {
        fs.mkdirSync(this.contractsDir, { recursive: true });
      }
      if (!fs.existsSync(this.kfsDir)) {
        fs.mkdirSync(this.kfsDir, { recursive: true });
      }
      if (!fs.existsSync(this.schedulesDir)) {
        fs.mkdirSync(this.schedulesDir, { recursive: true });
      }
    }
  }

  private async initializeBucket(): Promise<void> {
    if (!this.useCloudStorage || this.bucketInitialized) {
      return;
    }

    try {
      this.bucket = admin.storage().bucket();
      this.bucketInitialized = true;
      console.log('✅ PDF Service: Firebase Storage initialized');
    } catch (error) {
      console.warn('⚠️  PDF Service: Failed to initialize Firebase Storage, falling back to local storage:', error);
      this.useCloudStorage = false;
      // Ensure local directories exist as fallback
      if (!fs.existsSync(this.contractsDir)) {
        fs.mkdirSync(this.contractsDir, { recursive: true });
      }
      if (!fs.existsSync(this.kfsDir)) {
        fs.mkdirSync(this.kfsDir, { recursive: true });
      }
      if (!fs.existsSync(this.schedulesDir)) {
        fs.mkdirSync(this.schedulesDir, { recursive: true });
      }
    }
  }

  async generateContract(offer: Offer, fromUser: User): Promise<string> {
    const fileName = `${offer.id}-${Date.now()}.pdf`;
    const contractKey = `contracts/${fileName}`;
    
    try {
      await this.initializeBucket();
      const pdfBuffer = await this.createPdfContract(offer, fromUser);
      
      if (this.useCloudStorage && this.bucketInitialized) {
        // Upload to Firebase Storage
        const file = this.bucket.file(contractKey);
        await file.save(pdfBuffer, {
          metadata: {
            contentType: 'application/pdf',
            metadata: {
              offerId: offer.id,
              type: 'contract',
              generatedAt: new Date().toISOString()
            }
          }
        });
        console.log(`✅ Contract uploaded to Firebase Storage: ${contractKey}`);
      } else {
        // Save to local file system
        const filePath = path.join(this.contractsDir, fileName);
        fs.writeFileSync(filePath, pdfBuffer);
        console.log(`✅ Contract saved locally: ${filePath}`);
      }
      
      return contractKey;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to generate contract PDF: ${errorMessage}`);
      throw new Error(`Failed to generate contract PDF: ${errorMessage}`);
    }
  }

  private async createPdfContract(offer: Offer, fromUser: User): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Header
        doc.fontSize(20).font('Helvetica-Bold');
        doc.text('LENDING AGREEMENT', { align: 'center' });
        doc.moveDown(2);

        // Parties section
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('PARTIES TO THE AGREEMENT', { underline: true });
        doc.moveDown(0.5);
        
        doc.fontSize(12).font('Helvetica');
        if (offer.offerType === 'lend') {
          doc.text(`Lender: ${fromUser.name || 'N/A'}`);
          doc.text(`Phone: ${fromUser.phone}`);
          doc.moveDown(0.5);
          doc.text(`Borrower: ${offer.toUserName}`);
          doc.text(`Phone: ${offer.toUserPhone}`);
        } else {
          doc.text(`Borrower: ${fromUser.name || 'N/A'}`);
          doc.text(`Phone: ${fromUser.phone}`);
          doc.moveDown(0.5);
          doc.text(`Lender: ${offer.toUserName}`);
          doc.text(`Phone: ${offer.toUserPhone}`);
        }
        doc.moveDown(1);

        // Loan details section
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('LOAN DETAILS', { underline: true });
        doc.moveDown(0.5);
        
        doc.fontSize(12).font('Helvetica');
        doc.text(`Principal Amount: ₹${offer.amount.toLocaleString()}`);
        doc.text(`Interest Rate: ${offer.interestRate}% per annum`);
        doc.text(`Tenure: ${(offer as any).tenure || offer.tenureValue || 12} ${offer.tenureUnit}`);
        doc.text(`Repayment Type: ${offer.repaymentType}`);
        
        if (offer.repaymentFrequency) {
          doc.text(`Repayment Frequency: ${offer.repaymentFrequency}`);
        }
        
        doc.moveDown(1);

        // Terms and conditions
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('TERMS AND CONDITIONS', { underline: true });
        doc.moveDown(0.5);
        
        doc.fontSize(11).font('Helvetica');
        doc.text('1. The borrower agrees to repay the principal amount along with the agreed interest rate within the specified tenure.');
        doc.moveDown(0.3);
        doc.text('2. Late payment may result in additional charges as mutually agreed upon by both parties.');
        doc.moveDown(0.3);
        doc.text('3. This agreement is legally binding and enforceable under the laws of India.');
        doc.moveDown(0.3);
        doc.text('4. Any disputes arising from this agreement shall be resolved through mutual discussion or legal proceedings.');
        doc.moveDown(0.3);
        doc.text('5. Both parties acknowledge that they have read and understood all terms of this agreement.');
        doc.moveDown(1.5);

        // Signatures section
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('SIGNATURES', { underline: true });
        doc.moveDown(1);
        
        doc.fontSize(12).font('Helvetica');
        
        // Create two columns for signatures
        const leftX = 70;
        const rightX = 350;
        const signatureY = doc.y;
        
        doc.text('Lender Signature:', leftX, signatureY);
        doc.text('Borrower Signature:', rightX, signatureY);
        
        doc.moveDown(2);
        doc.text('_____________________', leftX);
        doc.text('_____________________', rightX);
        
        doc.moveDown(0.5);
        if (offer.offerType === 'lend') {
          doc.text(fromUser.name || 'N/A', leftX);
          doc.text(offer.toUserName, rightX);
        } else {
          doc.text(offer.toUserName, leftX);
          doc.text(fromUser.name || 'N/A', rightX);
        }
        
        doc.moveDown(1);
        doc.text('Date: _______________', leftX);
        doc.text('Date: _______________', rightX);
        
        // Footer
        doc.moveDown(2);
        doc.fontSize(10).font('Helvetica');
        doc.text('This document was generated by CredNXT - Secure Lending Platform', { align: 'center' });
        doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async contractExists(contractKey: string): Promise<boolean> {
    try {
      await this.initializeBucket();
      if (this.useCloudStorage && this.bucketInitialized) {
        const file = this.bucket.file(contractKey);
        const [exists] = await file.exists();
        return exists;
      } else {
        const filePath = path.join(process.cwd(), contractKey);
        return fs.existsSync(filePath);
      }
    } catch (error) {
      console.error(`Error checking contract existence: ${error}`);
      return false;
    }
  }

  async downloadContract(contractKey: string): Promise<Buffer> {
    try {
      await this.initializeBucket();
      if (this.useCloudStorage && this.bucketInitialized) {
        const file = this.bucket.file(contractKey);
        const [buffer] = await file.download();
        return buffer;
      } else {
        const filePath = path.join(process.cwd(), contractKey);
        
        if (!fs.existsSync(filePath)) {
          throw new Error('Contract file not found');
        }
        
        return fs.readFileSync(filePath);
      }
    } catch (error) {
      console.error('PDF download failed:', error);
      throw new Error('Failed to download contract PDF');
    }
  }

  async generateKFS(offer: Offer, fromUser: User): Promise<string> {
    const fileName = `kfs-${offer.id}-${Date.now()}.pdf`;
    const kfsKey = `kfs/${fileName}`;
    
    try {
      await this.initializeBucket();
      const pdfBuffer = await this.createKFSDocument(offer, fromUser);
      
      if (this.useCloudStorage && this.bucketInitialized) {
        // Upload to Firebase Storage
        const file = this.bucket.file(kfsKey);
        await file.save(pdfBuffer, {
          metadata: {
            contentType: 'application/pdf',
            metadata: {
              offerId: offer.id,
              type: 'kfs',
              generatedAt: new Date().toISOString()
            }
          }
        });
        console.log(`✅ KFS uploaded to Firebase Storage: ${kfsKey}`);
      } else {
        // Save to local file system
        const filePath = path.join(this.kfsDir, fileName);
        fs.writeFileSync(filePath, pdfBuffer);
        console.log(`✅ KFS saved locally: ${filePath}`);
      }
      
      return kfsKey;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to generate KFS PDF: ${errorMessage}`);
      throw new Error(`Failed to generate KFS document: ${errorMessage}`);
    }
  }

  async kfsExists(kfsKey: string): Promise<boolean> {
    try {
      await this.initializeBucket();
      if (this.useCloudStorage && this.bucketInitialized) {
        const file = this.bucket.file(kfsKey);
        const [exists] = await file.exists();
        return exists;
      } else {
        const filePath = path.join(process.cwd(), kfsKey);
        return fs.existsSync(filePath);
      }
    } catch (error) {
      console.error(`Error checking KFS existence: ${error}`);
      return false;
    }
  }

  async downloadKFS(kfsKey: string): Promise<Buffer> {
    try {
      await this.initializeBucket();
      if (this.useCloudStorage && this.bucketInitialized) {
        const file = this.bucket.file(kfsKey);
        const [buffer] = await file.download();
        return buffer;
      } else {
        const filePath = path.join(process.cwd(), kfsKey);
        
        if (!fs.existsSync(filePath)) {
          throw new Error('KFS file not found');
        }
        
        return fs.readFileSync(filePath);
      }
    } catch (error) {
      console.error('KFS download failed:', error);
      throw new Error('Failed to download KFS document');
    }
  }

  async generateRepaymentSchedule(offer: Offer, fromUser: User): Promise<string> {
    const fileName = `schedule-${offer.id}-${Date.now()}.pdf`;
    const scheduleKey = `schedules/${fileName}`;
    
    try {
      await this.initializeBucket();
      const pdfBuffer = await this.createRepaymentScheduleDocument(offer, fromUser);
      
      if (this.useCloudStorage && this.bucketInitialized) {
        // Upload to Firebase Storage
        const file = this.bucket.file(scheduleKey);
        await file.save(pdfBuffer, {
          metadata: {
            contentType: 'application/pdf',
            metadata: {
              offerId: offer.id,
              type: 'schedule',
              generatedAt: new Date().toISOString()
            }
          }
        });
        console.log(`✅ Repayment schedule uploaded to Firebase Storage: ${scheduleKey}`);
      } else {
        // Save to local file system
        const filePath = path.join(this.schedulesDir, fileName);
        fs.writeFileSync(filePath, pdfBuffer);
        console.log(`✅ Repayment schedule saved locally: ${filePath}`);
      }
      
      return scheduleKey;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to generate repayment schedule PDF: ${errorMessage}`);
      throw new Error(`Failed to generate repayment schedule document: ${errorMessage}`);
    }
  }

  async scheduleExists(scheduleKey: string): Promise<boolean> {
    try {
      await this.initializeBucket();
      if (this.useCloudStorage && this.bucketInitialized) {
        const file = this.bucket.file(scheduleKey);
        const [exists] = await file.exists();
        return exists;
      } else {
        const filePath = path.join(process.cwd(), scheduleKey);
        return fs.existsSync(filePath);
      }
    } catch (error) {
      console.error(`Error checking schedule existence: ${error}`);
      return false;
    }
  }

  async downloadRepaymentSchedule(scheduleKey: string): Promise<Buffer> {
    try {
      await this.initializeBucket();
      if (this.useCloudStorage && this.bucketInitialized) {
        const file = this.bucket.file(scheduleKey);
        const [buffer] = await file.download();
        return buffer;
      } else {
        const filePath = path.join(process.cwd(), scheduleKey);
        
        if (!fs.existsSync(filePath)) {
          throw new Error('Repayment schedule file not found');
        }
        
        return fs.readFileSync(filePath);
      }
    } catch (error) {
      console.error('Repayment schedule download failed:', error);
      throw new Error('Failed to download repayment schedule document');
    }
  }

  private async createRepaymentScheduleDocument(offer: Offer, fromUser: User): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        console.log('Starting PDF creation for offer:', offer.id);
        const doc = new PDFDocument({ 
          margin: 40,
          size: 'A4',
          layout: 'portrait'
        });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log('PDF generation completed, buffer size:', pdfBuffer.length);
          resolve(pdfBuffer);
        });
        doc.on('error', (error) => {
          console.error('PDF document error:', error);
          reject(error);
        });

        // Convert offer to LoanTerms
        console.log('Converting offer to loan terms...');
        const loanTerms = {
          principal: parseFloat(String(offer.amount)),
          interestRate: parseFloat(String(offer.interestRate)),
          interestType: offer.interestType as 'fixed' | 'reducing',
          tenureValue: (offer as any).tenure || offer.tenureValue || 12, // Use tenure from database or tenureValue
          tenureUnit: offer.tenureUnit as 'months' | 'years',
          repaymentType: (offer.repaymentType === 'interest_only' ? 'interest-only' : 
                          offer.repaymentType === 'full_payment' ? 'full-payment' : 
                          offer.repaymentType) as 'emi' | 'interest-only' | 'full-payment',
          repaymentFrequency: (offer as any).frequency || offer.repaymentFrequency || 'monthly', // Use frequency from database
          startDate: offer.startDate?.toDate ? offer.startDate.toDate() : new Date(offer.startDate as any)
        };
        console.log('Loan terms:', loanTerms);

        // Calculate repayment schedule
        console.log('Calculating repayment schedule...');
        const schedule = calculateRepaymentSchedule(loanTerms);
        console.log('Schedule calculated, items:', schedule.schedule.length);
        const principal = parseFloat(String(offer.amount));

        // Header
        doc.fontSize(20).font('Helvetica-Bold').fillColor('#2563eb');
        doc.text('REPAYMENT SCHEDULE', { align: 'center' });
        doc.moveDown(1);

        // Loan Summary Box
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#374151');
        doc.rect(40, doc.y, 515, 120).stroke('#e5e7eb');
        
        const boxY = doc.y;
        doc.y = boxY + 10;
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('Loan Summary', 50, doc.y);
        doc.moveDown(0.5);

        doc.fontSize(10).font('Helvetica');
        const col1X = 50;
        const col2X = 200;
        const col3X = 350;
        const rowHeight = 15;
        let currentY = doc.y;

        // Row 1
        doc.text(`Borrower: ${offer.offerType === 'lend' ? offer.toUserName : fromUser.name}`, col1X, currentY);
        doc.text(`Principal: ₹${principal.toLocaleString()}`, col2X, currentY);
        doc.text(`Interest Rate: ${offer.interestRate}%`, col3X, currentY);
        currentY += rowHeight;

        // Row 2
        doc.text(`Lender: ${offer.offerType === 'lend' ? fromUser.name : offer.toUserName}`, col1X, currentY);
        doc.text(`Total Amount: ₹${schedule.totalAmount.toLocaleString()}`, col2X, currentY);
        doc.text(`Interest Type: ${offer.interestType}`, col3X, currentY);
        currentY += rowHeight;

        // Row 3
        doc.text(`Tenure: ${(offer as any).tenure || offer.tenureValue || 12} ${offer.tenureUnit}`, col1X, currentY);
        doc.text(`Total Interest: ₹${schedule.totalInterest.toLocaleString()}`, col2X, currentY);
        doc.text(`Repayment Type: ${offer.repaymentType.replace('_', ' ')}`, col3X, currentY);
        currentY += rowHeight;

        // Row 4
        if (schedule.emiAmount) {
          doc.text(`Start Date: ${(offer.startDate?.toDate ? offer.startDate.toDate() : new Date(offer.startDate as any)).toLocaleDateString()}`, col1X, currentY);
          doc.text(`EMI Amount: ₹${schedule.emiAmount.toLocaleString()}`, col2X, currentY);
          doc.text(`Payment Frequency: ${offer.repaymentFrequency || 'monthly'}`, col3X, currentY);
        } else {
          doc.text(`Start Date: ${(offer.startDate?.toDate ? offer.startDate.toDate() : new Date(offer.startDate as any)).toLocaleDateString()}`, col1X, currentY);
          doc.text(`Due Date: ${(offer.dueDate?.toDate ? offer.dueDate.toDate() : new Date(offer.dueDate as any)).toLocaleDateString()}`, col2X, currentY);
          doc.text(`Payment Frequency: ${offer.repaymentFrequency || 'monthly'}`, col3X, currentY);
        }

        doc.y = boxY + 130;
        doc.moveDown(1);

        // Repayment Schedule Table
        this.addRepaymentSchedule(doc, schedule.schedule);

        // Footer
        doc.fontSize(8).fillColor('#666');
        doc.text('This repayment schedule is generated electronically and is for reference purposes.', {
          align: 'center'
        });
        doc.text(`Generated on: ${new Date().toLocaleDateString()} | Document ID: ${offer.id}`, {
          align: 'center'
        });

        doc.end();
      } catch (error) {
        console.error('Error in createRepaymentScheduleDocument:', error);
        reject(error);
      }
    });
  }

  private async createKFSDocument(offer: Offer, fromUser: User): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          margin: 40,
          size: 'A4',
          layout: 'portrait'
        });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Convert offer to LoanTerms
        // Note: LoanTerms only supports 'monthly' | 'yearly' for repaymentFrequency
        const loanTerms = {
          principal: parseFloat(String(offer.amount)),
          interestRate: parseFloat(String(offer.interestRate)),
          interestType: offer.interestType as 'fixed' | 'reducing',
          tenureValue: (offer as any).tenure || offer.tenureValue || 12,
          tenureUnit: offer.tenureUnit as 'months' | 'years',
          repaymentType: (offer.repaymentType === 'interest_only' ? 'interest-only' : 
                          offer.repaymentType === 'full_payment' ? 'full-payment' : 
                          offer.repaymentType) as 'emi' | 'interest-only' | 'full-payment',
          repaymentFrequency: offer.repaymentFrequency || undefined,
          startDate: offer.startDate?.toDate ? offer.startDate.toDate() : new Date(offer.startDate as any)
        };

        // Calculate loan details
        const principal = parseFloat(String(offer.amount));
        const schedule = calculateRepaymentSchedule(loanTerms);
        const totalAmount = schedule.totalAmount;
        const totalInterest = schedule.totalInterest;
        
        // Calculate EMI amount for EMI type repayments
        const emiAmount = schedule.emiAmount || 0;

        // Calculate APR (approximate)
        const annualRate = parseFloat(String(offer.interestRate));
        const tenureInMonths = this.getTenureInMonths((offer as any).tenure || offer.tenureValue || 12, offer.tenureUnit);
        const processingFee = Math.min(principal * 0.04, 100); // 4% or ₹100 max
        const gst = processingFee * 0.18; // 18% GST
        const totalFees = processingFee + gst;
        const netDisbursed = principal - totalFees;
        
        // Simple APR calculation
        const apr = this.calculateAPR(principal, totalInterest, totalFees, tenureInMonths);

        // Header with organization details
        this.addKFSHeader(doc);

        // Loan Details Table
        this.addLoanDetailsTable(doc, offer, principal, schedule.numberOfPayments, emiAmount, annualRate, processingFee, gst, apr);

        // Additional disclosures
        this.addAdditionalDisclosures(doc, offer);

        // Repayment schedule
        if (schedule.schedule.length > 0) {
          this.addRepaymentSchedule(doc, schedule.schedule);
        }

        // APR calculation illustration
        this.addAPRIllustration(doc, principal, tenureInMonths, totalInterest, totalFees, netDisbursed, totalAmount, apr);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private addKFSHeader(doc: PDFKit.PDFDocument) {
    // Header with logo space and contact details
    doc.fontSize(8).font('Helvetica');
    doc.text('help@crednxt.com', 450, 30);
    doc.text('+91 804 8329999', 450, 45);
    doc.text('U65100AS2016PLC017505', 450, 60);
    
    doc.moveDown(2);
  }

  private addLoanDetailsTable(doc: PDFKit.PDFDocument, offer: Offer, principal: number, installments: number, emiAmount: number, interestRate: number, processingFee: number, gst: number, apr: number) {
    let y = doc.y + 20;
    const leftCol = 40;
    const rightCol = 320;
    const colWidth = 250;

    // Table header styling
    doc.fontSize(10).font('Helvetica-Bold');

    // Row 1: Loan proposal/account No.
    doc.text('1', leftCol, y);
    doc.text('Loan proposal/account No.', leftCol + 20, y);
    doc.text(offer.id.substring(0, 16).toUpperCase(), rightCol, y);
    doc.text('Type of loan', rightCol + 150, y);
    doc.text('Personal Loan', rightCol + 250, y);
    y += 20;

    // Row 2: Lender
    doc.text('2', leftCol, y);
    doc.text('Lender', leftCol + 20, y);
    doc.text('CredNXT Lending Platform', rightCol, y);
    y += 20;

    // Row 3: Sanctioned loan amount
    doc.text('3', leftCol, y);
    doc.text('Sanctioned loan amount', leftCol + 20, y);
    doc.text(`₹${principal.toFixed(2)}`, rightCol, y);
    y += 20;

    // Row 4: Disbursal schedule
    doc.text('4', leftCol, y);
    doc.text('Disbursal schedule', leftCol + 20, y);
    doc.text('100%', rightCol, y);
    y += 20;

    // Row 5: Loan term
    doc.text('5', leftCol, y);
    doc.text('Loan term (in months)', leftCol + 20, y);
    doc.text(this.getTenureInMonths((offer as any).tenure || offer.tenureValue || 12, offer.tenureUnit).toString(), rightCol, y);
    y += 20;

    // Row 6: Instalment details
    doc.text('6', leftCol, y);
    doc.text('Instalment details', leftCol + 20, y);
    y += 15;

    // Sub-table for installment details
    doc.fontSize(9).font('Helvetica');
    doc.text('Type of installments', leftCol + 20, y);
    doc.text('Number of EPIs', leftCol + 120, y);
    doc.text('EPI (₹)', leftCol + 200, y);
    doc.text('Commencement of repayment, post sanction', leftCol + 280, y);
    y += 15;

    const repaymentTypeDisplay = offer.repaymentType === 'emi' ? 'Monthly' : 
                               offer.repaymentType === 'full_payment' ? 'Lump Sum' : 'Interest Only';
    doc.text(repaymentTypeDisplay, leftCol + 20, y);
    doc.text(installments.toString(), leftCol + 120, y);
    doc.text(emiAmount > 0 ? emiAmount.toFixed(2) : 'N/A', leftCol + 200, y);
    
    const startDate = offer.startDate?.toDate ? offer.startDate.toDate() : new Date(offer.startDate as any);
    startDate.setDate(startDate.getDate() + 5); // 5 days post sanction
    doc.text(startDate.toLocaleDateString('en-GB'), leftCol + 280, y);
    y += 25;

    // Row 7: Interest rate
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('7', leftCol, y);
    doc.text('Interest rate (%) (Fixed)', leftCol + 20, y);
    doc.text(interestRate.toString(), rightCol, y);
    y += 20;

    // Row 8: Fee/Charges
    doc.text('8', leftCol, y);
    doc.text('Fee/ Charges', leftCol + 20, y);
    y += 15;

    // Fee table headers
    doc.fontSize(9).font('Helvetica');
    doc.text('Payable to the RE (A)', leftCol + 40, y);
    doc.text('Payable to a third party through RE (B)', rightCol, y);
    y += 15;
    doc.text('One-time/ Recurring', leftCol + 40, y);
    doc.text('Amount (in ₹)', leftCol + 150, y);
    doc.text('One- time/Recurring', rightCol, y);
    doc.text('Amount (in ₹)', rightCol + 120, y);
    y += 15;

    // Processing fees
    doc.text('(i) Processing fees', leftCol + 20, y);
    doc.text('One-time', leftCol + 40, y);
    doc.text(`₹${processingFee.toFixed(2)} (Incl. of ₹${gst.toFixed(2)} GST)`, leftCol + 150, y);
    doc.text('NA', rightCol, y);
    doc.text('NA', rightCol + 120, y);
    y += 15;

    // Insurance charges
    doc.text('(ii) Insurance charges', leftCol + 20, y);
    doc.text('NA', leftCol + 40, y);
    doc.text('NA', leftCol + 150, y);
    doc.text('One-time', rightCol, y);
    doc.text('0.00', rightCol + 120, y);
    y += 20;

    // Row 9: APR
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('9', leftCol, y);
    doc.text('Annual Percentage Rate (APR) (%)', leftCol + 20, y);
    doc.text(apr.toFixed(2), rightCol, y);
    y += 20;

    // Row 10: Contingent Charges
    doc.text('10', leftCol, y);
    doc.text('Details of Contingent Charges', leftCol + 20, y);
    y += 15;

    doc.fontSize(9).font('Helvetica');
    doc.text('(i) Penal charges, if any, in case of delayed payment', leftCol + 20, y);
    doc.text('₹500 or 30% of EMI amount whichever is lower', rightCol, y);
    y += 15;

    doc.text('(ii) Other penal charges, if any', leftCol + 20, y);
    doc.text('NA', rightCol, y);
    y += 15;

    doc.text('(iii) Foreclosure charges, if applicable', leftCol + 20, y);
    doc.text('₹0', rightCol, y);
    y += 30;

    doc.y = y;
  }

  private addAdditionalDisclosures(doc: PDFKit.PDFDocument, offer: Offer) {
    doc.addPage();
    
    // Header again
    this.addKFSHeader(doc);
    
    let y = doc.y + 20;
    const leftCol = 40;
    const rightCol = 320;

    doc.fontSize(10).font('Helvetica-Bold');

    // Additional disclosures table
    doc.text('1', leftCol, y);
    doc.text('Clause of Loan agreement relating to engagement of recovery agents', leftCol + 20, y);
    doc.text('Clause 27', rightCol, y);
    y += 20;

    doc.text('2', leftCol, y);
    doc.text('Clause of Loan agreement which details grievance redressal mechanism', leftCol + 20, y);
    doc.text('Clause 26', rightCol, y);
    y += 20;

    doc.text('3', leftCol, y);
    doc.text('Phone number and email id of the nodal grievance redressal officer', leftCol + 20, y);
    y += 15;

    doc.fontSize(9).font('Helvetica');
    doc.text('Mr. Aashish Saxena', rightCol, y);
    y += 12;
    doc.text('Designation: Grievance Redressal Officer', rightCol, y);
    y += 12;
    doc.text('Contact no: +91 8069390473', rightCol, y);
    y += 12;
    doc.text('Email: customergrievance@crednxt.com', rightCol, y);
    y += 20;

    doc.text('Ms. Swetha S', rightCol, y);
    y += 12;
    doc.text('Designation: Principal Nodal Officer', rightCol, y);
    y += 12;
    doc.text('Contact no: +91 8048318328', rightCol, y);
    y += 12;
    doc.text('Email: nodalofficer@crednxt.com', rightCol, y);
    y += 25;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('4', leftCol, y);
    doc.text('Whether the loan is, or in future maybe, subject to transfer to other REs or securitisation (Yes/ No)', leftCol + 20, y);
    doc.text('Yes', rightCol, y);
    y += 20;

    doc.text('5', leftCol, y);
    doc.text('In case of digital loans, following specific disclosures may be furnished:', leftCol + 20, y);
    y += 15;

    doc.fontSize(9).font('Helvetica');
    doc.text('(i) Cooling off/look-up period, in terms of RE\'s board approved policy, during which borrower shall not be charged any penalty on prepayment of loan', leftCol + 20, y);
    doc.text('3 days', rightCol, y);
    y += 20;

    doc.text('(ii) Details of LSP acting as recovery agent and authorized to approach the borrower', leftCol + 20, y);
    doc.text('List of recovery agents and recovery mechanism', rightCol, y);

    doc.y = y + 30;
  }

  private addRepaymentSchedule(doc: PDFKit.PDFDocument, schedule: PaymentScheduleItem[]) {
    // Add new page for the schedule table
    doc.addPage();
    
    // Schedule header
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#2563eb');
    doc.text('Payment Schedule Details', { align: 'center' });
    doc.moveDown(1.5);

    // Table setup
    const startY = doc.y;
    let y = startY;
    const leftCol = 40;
    const col2 = 120;
    const col3 = 200;
    const col4 = 280;
    const col5 = 360;
    const col6 = 460;

    // Table headers with background
    doc.rect(leftCol, y - 5, 515, 20).fillAndStroke('#f3f4f6', '#e5e7eb');
    
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151');
    doc.text('#', leftCol + 5, y);
    doc.text('DUE DATE', col2, y);
    doc.text('PRINCIPAL', col3, y);
    doc.text('INTEREST', col4, y);
    doc.text('EMI/AMOUNT', col5, y);
    doc.text('BALANCE', col6, y);
    y += 25;

    // Table data
    doc.fontSize(8).font('Helvetica');
    
    schedule.forEach((payment, index) => {
      if (y > 720) { // Start new page if needed
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#2563eb');
        doc.text('Payment Schedule Details (Continued)', { align: 'center' });
        doc.moveDown(1);
        y = doc.y;
        
        // Repeat headers
        doc.rect(leftCol, y - 5, 515, 20).fillAndStroke('#f3f4f6', '#e5e7eb');
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151');
        doc.text('#', leftCol + 5, y);
        doc.text('DUE DATE', col2, y);
        doc.text('PRINCIPAL', col3, y);
        doc.text('INTEREST', col4, y);
        doc.text('EMI/AMOUNT', col5, y);
        doc.text('BALANCE', col6, y);
        y += 25;
        doc.fontSize(8).font('Helvetica');
      }

      // Add row background for alternating colors
      if (index % 2 === 0) {
        doc.rect(leftCol, y - 3, 515, 18).fill('#fafafa');
      }

      doc.fillColor('#374151');
      doc.text((index + 1).toString(), leftCol + 5, y);
      doc.text(payment.dueDate.toLocaleDateString('en-GB'), col2, y);
      doc.text(`₹${payment.principalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, col3, y);
      doc.text(`₹${payment.interestAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, col4, y);
      doc.text(`₹${payment.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, col5, y);
      doc.text(`₹${payment.remainingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, col6, y);
      y += 18;
    });

    doc.y = y + 20;
  }

  private addAPRIllustration(doc: PDFKit.PDFDocument, principal: number, tenureInMonths: number, totalInterest: number, totalFees: number, netDisbursed: number, totalAmount: number, apr: number) {
    doc.addPage();
    
    // Header again
    this.addKFSHeader(doc);
    
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('Illustration for computation of APR', 40, doc.y + 20);
    doc.moveDown(1);

    let y = doc.y + 10;
    const leftCol = 40;
    const rightCol = 320;

    const tableData = [
      ['1', 'Sanctioned loan amount', `₹${principal.toFixed(2)}`],
      ['2', 'Loan Term (in months)', tenureInMonths.toString()],
      ['a)', 'No. of instalments for payment of principal, in case of non-equated periodic loans', '-'],
      ['b)', 'Type of EPI', 'Monthly'],
      ['', 'Amount of each EPI and nos. of EPIs (in months)', `₹${(totalAmount / tenureInMonths).toFixed(2)} / ${tenureInMonths}`],
      ['c)', 'No. of instalments for payment of capitalised interest, if any', '-'],
      ['d)', 'Commencement of repayments, post sanction', '25 days'],
      ['3', 'Interest rate type', 'Fixed'],
      ['4', 'Rate of Interest (%)', parseFloat(principal.toString()).toString()],
      ['5', 'Total interest amount to be charged during the entire tenor of the loan as per the rate prevailing on sanction date', `₹${totalInterest.toFixed(2)}`],
      ['6', 'Fee/ Charges Payable (Total)', `₹${totalFees.toFixed(2)} (Incl. of ₹${(totalFees * 0.18).toFixed(2)} GST)`],
      ['a)', 'Payable to RE', `₹${totalFees.toFixed(2)} (Incl. of ₹${(totalFees * 0.18).toFixed(2)} GST)`],
      ['b)', 'Payable to third-party routed through RE', '₹0.00'],
      ['7', 'Net disbursed amount', `₹${netDisbursed.toFixed(2)}`],
      ['8', 'Total amount to be paid by borrower', `₹${totalAmount.toFixed(2)}`],
      ['9', 'Annual Percentage Rate - Effective annualized interest rate (%)', apr.toFixed(2)]
    ];

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Sr. No.', leftCol, y);
    doc.text('Parameter', leftCol + 60, y);
    doc.text('Details', rightCol, y);
    y += 20;

    doc.fontSize(9).font('Helvetica');
    tableData.forEach(([srNo, parameter, details]) => {
      if (y > 720) {
        doc.addPage();
        this.addKFSHeader(doc);
        y = doc.y + 20;
      }
      
      doc.text(srNo, leftCol, y);
      doc.text(parameter, leftCol + 60, y, { width: 240 });
      doc.text(details, rightCol, y, { width: 200 });
      y += 15;
    });

    // Footer note
    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica');
    doc.text('1 During foreclosure, 1 day of extra interest will be charged from the paid date due to settlement delay.', 40);
    
    doc.moveDown(2);
    doc.text('1st & 3rd Floor, Fortune Central, Basistha Road, Basisthapur, Bylane No. 3, Guwahati - 781028', { align: 'center' });
  }

  private getTenureInMonths(value: number, unit: string): number {
    switch (unit) {
      case 'days': return Math.ceil(value / 30);
      case 'weeks': return Math.ceil(value / 4.33);
      case 'months': return value;
      case 'years': return value * 12;
      default: return value;
    }
  }

  private calculateAPR(principal: number, totalInterest: number, totalFees: number, tenureInMonths: number): number {
    // Simple APR calculation: ((Total Interest + Fees) / Principal) * (12 / Tenure in Months) * 100
    const effectiveInterest = totalInterest + totalFees;
    const annualizedRate = (effectiveInterest / principal) * (12 / tenureInMonths) * 100;
    return Math.min(annualizedRate, 99.99); // Cap at 99.99%
  }
}

export const pdfService = new PdfService();
