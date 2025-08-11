import { Offer, User } from "@shared/schema";
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export class PdfService {
  private contractsDir = path.join(process.cwd(), 'contracts');

  constructor() {
    // Ensure contracts directory exists
    if (!fs.existsSync(this.contractsDir)) {
      fs.mkdirSync(this.contractsDir, { recursive: true });
    }
  }

  async generateContract(offer: Offer, fromUser: User): Promise<string> {
    const fileName = `${offer.id}-${Date.now()}.pdf`;
    const contractKey = `contracts/${fileName}`;
    const filePath = path.join(this.contractsDir, fileName);
    
    try {
      console.log(`Creating PDF contract at: ${filePath}`);
      console.log(`Directory exists: ${fs.existsSync(this.contractsDir)}`);
      
      const pdfBuffer = await this.createPdfContract(offer, fromUser);
      fs.writeFileSync(filePath, pdfBuffer);
      
      console.log(`Generated PDF contract: ${contractKey}, file size: ${pdfBuffer.length} bytes`);
      console.log(`File exists after write: ${fs.existsSync(filePath)}`);
      
      return contractKey;
    } catch (error) {
      console.error('PDF generation failed:', error);
      console.error('Error details:', {
        contractsDir: this.contractsDir,
        filePath,
        dirExists: fs.existsSync(this.contractsDir),
        error: error.message
      });
      throw new Error('Failed to generate contract PDF');
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
}

export const pdfService = new PdfService();
