import { Offer, User } from "@shared/schema";
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { calculateRepaymentSchedule, PaymentScheduleItem } from "@shared/calculations";

export class PdfService {
  private contractsDir = path.join(process.cwd(), 'contracts');
  private kfsDir = path.join(process.cwd(), 'kfs');

  constructor() {
    // Ensure directories exist
    if (!fs.existsSync(this.contractsDir)) {
      fs.mkdirSync(this.contractsDir, { recursive: true });
    }
    if (!fs.existsSync(this.kfsDir)) {
      fs.mkdirSync(this.kfsDir, { recursive: true });
    }
  }

  async generateContract(offer: Offer, fromUser: User): Promise<string> {
    const fileName = `${offer.id}-${Date.now()}.pdf`;
    const contractKey = `contracts/${fileName}`;
    const filePath = path.join(this.contractsDir, fileName);
    
    try {
      const pdfBuffer = await this.createPdfContract(offer, fromUser);
      fs.writeFileSync(filePath, pdfBuffer);
      return contractKey;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
        doc.text(`Tenure: ${offer.tenureValue} ${offer.tenureUnit}`);
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
      const filePath = path.join(process.cwd(), contractKey);
      return fs.existsSync(filePath);
    } catch (error) {
      return false;
    }
  }

  async downloadContract(contractKey: string): Promise<Buffer> {
    try {
      const filePath = path.join(process.cwd(), contractKey);
      
      if (!fs.existsSync(filePath)) {
        throw new Error('Contract file not found');
      }
      
      return fs.readFileSync(filePath);
    } catch (error) {
      console.error('PDF download failed:', error);
      throw new Error('Failed to download contract PDF');
    }
  }

  async generateKFS(offer: Offer, fromUser: User): Promise<string> {
    const fileName = `kfs-${offer.id}-${Date.now()}.pdf`;
    const kfsKey = `kfs/${fileName}`;
    const filePath = path.join(this.kfsDir, fileName);
    
    try {
      console.log(`Creating KFS document at: ${filePath}`);
      
      const pdfBuffer = await this.createKFSDocument(offer, fromUser);
      fs.writeFileSync(filePath, pdfBuffer);
      
      console.log(`Generated KFS document: ${kfsKey}, file size: ${pdfBuffer.length} bytes`);
      
      return kfsKey;
    } catch (error) {
      console.error('KFS generation failed:', error);
      throw new Error('Failed to generate KFS document');
    }
  }

  async kfsExists(kfsKey: string): Promise<boolean> {
    try {
      const filePath = path.join(process.cwd(), kfsKey);
      return fs.existsSync(filePath);
    } catch (error) {
      return false;
    }
  }

  async downloadKFS(kfsKey: string): Promise<Buffer> {
    try {
      const filePath = path.join(process.cwd(), kfsKey);
      
      if (!fs.existsSync(filePath)) {
        throw new Error('KFS file not found');
      }
      
      return fs.readFileSync(filePath);
    } catch (error) {
      // Log error through proper error handling
      throw new Error('Failed to download KFS document');
    }
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
        const loanTerms = {
          principal: parseFloat(offer.amount),
          interestRate: parseFloat(offer.interestRate),
          interestType: offer.interestType as 'fixed' | 'reducing',
          tenureValue: offer.tenureValue,
          tenureUnit: offer.tenureUnit as 'months' | 'years',
          repaymentType: offer.repaymentType as 'emi' | 'interest_only' | 'full_payment',
          repaymentFrequency: offer.repaymentFrequency as 'weekly' | 'monthly' | 'yearly' | undefined,
          startDate: new Date(offer.startDate)
        };

        // Calculate loan details
        const principal = parseFloat(offer.amount);
        const schedule = calculateRepaymentSchedule(loanTerms);
        const totalAmount = schedule.totalAmount;
        const totalInterest = schedule.totalInterest;
        
        // Calculate EMI amount for EMI type repayments
        const emiAmount = schedule.emiAmount || 0;

        // Calculate APR (approximate)
        const annualRate = parseFloat(offer.interestRate);
        const tenureInMonths = this.getTenureInMonths(offer.tenureValue, offer.tenureUnit);
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
    doc.text(this.getTenureInMonths(offer.tenureValue, offer.tenureUnit).toString(), rightCol, y);
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
    
    const startDate = new Date(offer.startDate);
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
    doc.addPage();
    
    // Header again
    this.addKFSHeader(doc);
    
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('Repayment schedule', 40, doc.y + 20);
    doc.moveDown(1);

    const startY = doc.y + 10;
    let y = startY;
    const leftCol = 40;
    const col2 = 140;
    const col3 = 240;
    const col4 = 340;
    const col5 = 440;

    // Table headers
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('DUE DATE', leftCol, y);
    doc.text('PRINCIPAL', col2, y);
    doc.text('INTEREST', col3, y);
    doc.text('AMOUNT', col4, y);
    doc.text('PRINCIPAL REMAINING', col5, y);
    y += 20;

    // Table data
    doc.fontSize(9).font('Helvetica');
    
    schedule.forEach((payment, index) => {
      if (y > 700) { // Start new page if needed
        doc.addPage();
        this.addKFSHeader(doc);
        y = doc.y + 20;
      }

      const dueDate = payment.dueDate;
      const principal = payment.principalAmount;
      const interest = payment.interestAmount;
      const amount = payment.totalAmount;
      const remainingBalance = payment.remainingBalance;

      doc.text(dueDate.toLocaleDateString('en-GB'), leftCol, y);
      doc.text(`₹${principal.toFixed(2)}`, col2, y);
      doc.text(`₹${interest.toFixed(2)}`, col3, y);
      doc.text(`₹${amount.toFixed(2)}`, col4, y);
      doc.text(`₹${remainingBalance.toFixed(2)}`, col5, y);
      y += 15;
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
