"use strict";
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const PDFDocument = require('pdfkit');
// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const pdfApp = express();
// Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Authentication required',
                code: 'AUTH_TOKEN_MISSING'
            });
        }
        const token = authHeader.substring(7);
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.userId = decodedToken.uid;
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({
            message: 'Invalid authentication token',
            code: 'AUTH_TOKEN_INVALID'
        });
    }
};
// Utility functions for PDF generation
function formatCurrency(amount) {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDate(date) {
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}
function calculateEMI(principal, rate, tenure) {
    const monthlyRate = rate / 100 / 12;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
        (Math.pow(1 + monthlyRate, tenure) - 1);
    return Math.round(emi * 100) / 100;
}
function generateRepaymentSchedule(amount, rate, tenure, startDate) {
    const schedule = [];
    const monthlyEMI = calculateEMI(amount, rate, tenure);
    let balance = amount;
    for (let i = 1; i <= tenure; i++) {
        const paymentDate = new Date(startDate);
        paymentDate.setMonth(paymentDate.getMonth() + i);
        const interestAmount = balance * (rate / 100 / 12);
        const principalAmount = monthlyEMI - interestAmount;
        balance = Math.max(0, balance - principalAmount);
        schedule.push({
            installmentNumber: i,
            paymentDate,
            emiAmount: monthlyEMI,
            principalAmount: Math.round(principalAmount * 100) / 100,
            interestAmount: Math.round(interestAmount * 100) / 100,
            balance: Math.round(balance * 100) / 100
        });
    }
    return schedule;
}
// PDF Contract Generator
pdfApp.get('/offers/:id/pdf/contract', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const offerDoc = await db.collection('offers').doc(id).get();
        if (!offerDoc.exists) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        const offerData = offerDoc.data();
        // Check authorization
        if ((offerData === null || offerData === void 0 ? void 0 : offerData.fromUserId) !== req.userId && (offerData === null || offerData === void 0 ? void 0 : offerData.toUserId) !== req.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        // Get user details
        const [fromUserDoc, toUserDoc] = await Promise.all([
            db.collection('users').doc(offerData.fromUserId).get(),
            offerData.toUserId ? db.collection('users').doc(offerData.toUserId).get() : null
        ]);
        const fromUser = fromUserDoc.data();
        const toUser = toUserDoc === null || toUserDoc === void 0 ? void 0 : toUserDoc.data();
        // Create PDF
        const doc = new PDFDocument({ margin: 50 });
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="loan-contract-${id}.pdf"`);
        // Pipe PDF to response
        doc.pipe(res);
        // PDF Header
        doc.fontSize(20).text('LOAN AGREEMENT CONTRACT', { align: 'center' });
        doc.moveDown();
        // Contract details
        doc.fontSize(12)
            .text(`Contract ID: ${id}`)
            .text(`Date: ${formatDate(new Date())}`)
            .moveDown();
        // Parties
        doc.fontSize(14).text('PARTIES:', { underline: true });
        doc.fontSize(12)
            .text(`Lender: ${(fromUser === null || fromUser === void 0 ? void 0 : fromUser.name) || 'Unknown'}`)
            .text(`Phone: ${(fromUser === null || fromUser === void 0 ? void 0 : fromUser.phone) || 'N/A'}`)
            .moveDown()
            .text(`Borrower: ${(toUser === null || toUser === void 0 ? void 0 : toUser.name) || offerData.toUserName || 'Unknown'}`)
            .text(`Phone: ${offerData.toUserPhone || 'N/A'}`)
            .moveDown();
        // Loan Terms
        doc.fontSize(14).text('LOAN TERMS:', { underline: true });
        doc.fontSize(12)
            .text(`Principal Amount: ${formatCurrency(offerData.amount)}`)
            .text(`Interest Rate: ${offerData.interestRate}% per annum`)
            .text(`Tenure: ${offerData.tenure} ${offerData.tenureUnit}`)
            .text(`Repayment Frequency: ${offerData.frequency}`)
            .text(`Purpose: ${offerData.purpose || 'Not specified'}`)
            .moveDown();
        if (offerData.collateral) {
            doc.text(`Collateral: ${offerData.collateral}`).moveDown();
        }
        // Terms and Conditions
        doc.fontSize(14).text('TERMS AND CONDITIONS:', { underline: true });
        doc.fontSize(10)
            .text('1. The borrower agrees to repay the loan amount along with interest as per the schedule.')
            .text('2. Late payment charges may apply as per RBI guidelines.')
            .text('3. This agreement is governed by Indian laws.')
            .text('4. Any disputes will be subject to the jurisdiction of Indian courts.')
            .moveDown();
        // Signatures
        doc.fontSize(12)
            .text('Lender Signature: _________________    Date: _________')
            .moveDown()
            .text('Borrower Signature: _______________    Date: _________');
        doc.end();
    }
    catch (error) {
        console.error('Contract PDF generation error:', error);
        res.status(500).json({ message: 'Failed to generate contract PDF' });
    }
});
// PDF KFS (Key Fact Statement) Generator
pdfApp.get('/offers/:id/pdf/kfs', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const offerDoc = await db.collection('offers').doc(id).get();
        if (!offerDoc.exists) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        const offerData = offerDoc.data();
        // Check authorization
        if ((offerData === null || offerData === void 0 ? void 0 : offerData.fromUserId) !== req.userId && (offerData === null || offerData === void 0 ? void 0 : offerData.toUserId) !== req.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        // Create PDF
        const doc = new PDFDocument({ margin: 50 });
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="kfs-${id}.pdf"`);
        // Pipe PDF to response
        doc.pipe(res);
        // PDF Header
        doc.fontSize(18).text('KEY FACT STATEMENT (KFS)', { align: 'center' });
        doc.moveDown();
        // Loan Summary
        doc.fontSize(14).text('LOAN SUMMARY:', { underline: true });
        doc.fontSize(12)
            .text(`Loan Amount: ${formatCurrency(offerData.amount)}`)
            .text(`Interest Rate: ${offerData.interestRate}% per annum`)
            .text(`Loan Tenure: ${offerData.tenure} ${offerData.tenureUnit}`)
            .text(`Repayment Mode: ${offerData.frequency}`)
            .moveDown();
        // Cost Breakdown
        const totalTenureMonths = offerData.tenureUnit === 'years'
            ? offerData.tenure * 12
            : offerData.tenureUnit === 'months'
                ? offerData.tenure
                : Math.ceil(offerData.tenure / 30);
        const emi = calculateEMI(offerData.amount, offerData.interestRate, totalTenureMonths);
        const totalAmount = emi * totalTenureMonths;
        const totalInterest = totalAmount - offerData.amount;
        doc.fontSize(14).text('COST BREAKDOWN:', { underline: true });
        doc.fontSize(12)
            .text(`Monthly EMI: ${formatCurrency(emi)}`)
            .text(`Total Interest: ${formatCurrency(totalInterest)}`)
            .text(`Total Amount Payable: ${formatCurrency(totalAmount)}`)
            .moveDown();
        // Important Terms
        doc.fontSize(14).text('IMPORTANT TERMS:', { underline: true });
        doc.fontSize(10)
            .text('• Interest is calculated on reducing balance method')
            .text('• Prepayment allowed without charges')
            .text('• Late payment charges: 2% per month on overdue amount')
            .text('• Default interest rate: Additional 2% per annum')
            .moveDown();
        // RBI Guidelines
        doc.fontSize(14).text('RBI GUIDELINES:', { underline: true });
        doc.fontSize(10)
            .text('• This loan is governed by RBI Fair Practices Code')
            .text('• Borrower has right to receive loan statements')
            .text('• Grievance redressal mechanism available')
            .text('• Interest rates are as per RBI guidelines');
        doc.end();
    }
    catch (error) {
        console.error('KFS PDF generation error:', error);
        res.status(500).json({ message: 'Failed to generate KFS PDF' });
    }
});
// PDF Repayment Schedule Generator
pdfApp.get('/offers/:id/pdf/schedule', authenticate, async (req, res) => {
    var _a;
    try {
        const { id } = req.params;
        const offerDoc = await db.collection('offers').doc(id).get();
        if (!offerDoc.exists) {
            return res.status(404).json({ message: 'Offer not found' });
        }
        const offerData = offerDoc.data();
        // Check authorization
        if ((offerData === null || offerData === void 0 ? void 0 : offerData.fromUserId) !== req.userId && (offerData === null || offerData === void 0 ? void 0 : offerData.toUserId) !== req.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }
        // Calculate schedule
        const startDate = ((_a = offerData.createdAt) === null || _a === void 0 ? void 0 : _a.toDate()) || new Date();
        const totalTenureMonths = offerData.tenureUnit === 'years'
            ? offerData.tenure * 12
            : offerData.tenureUnit === 'months'
                ? offerData.tenure
                : Math.ceil(offerData.tenure / 30);
        const schedule = generateRepaymentSchedule(offerData.amount, offerData.interestRate, totalTenureMonths, startDate);
        // Create PDF
        const doc = new PDFDocument({ margin: 50 });
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="repayment-schedule-${id}.pdf"`);
        // Pipe PDF to response
        doc.pipe(res);
        // PDF Header
        doc.fontSize(16).text('LOAN REPAYMENT SCHEDULE', { align: 'center' });
        doc.moveDown();
        // Loan Details
        doc.fontSize(12)
            .text(`Loan Amount: ${formatCurrency(offerData.amount)}`)
            .text(`Interest Rate: ${offerData.interestRate}% per annum`)
            .text(`Tenure: ${offerData.tenure} ${offerData.tenureUnit}`)
            .moveDown();
        // Table Headers
        doc.fontSize(10)
            .text('No.', 50, doc.y, { width: 30 })
            .text('Date', 80, doc.y, { width: 80 })
            .text('EMI', 160, doc.y, { width: 70 })
            .text('Principal', 230, doc.y, { width: 70 })
            .text('Interest', 300, doc.y, { width: 70 })
            .text('Balance', 370, doc.y, { width: 70 });
        doc.moveDown();
        // Table Data
        schedule.forEach((payment, index) => {
            if (doc.y > 700) { // Start new page if needed
                doc.addPage();
                doc.fontSize(10);
            }
            doc.text(payment.installmentNumber.toString(), 50, doc.y, { width: 30 })
                .text(formatDate(payment.paymentDate), 80, doc.y, { width: 80 })
                .text(formatCurrency(payment.emiAmount), 160, doc.y, { width: 70 })
                .text(formatCurrency(payment.principalAmount), 230, doc.y, { width: 70 })
                .text(formatCurrency(payment.interestAmount), 300, doc.y, { width: 70 })
                .text(formatCurrency(payment.balance), 370, doc.y, { width: 70 });
            doc.moveDown(0.5);
        });
        doc.end();
    }
    catch (error) {
        console.error('Schedule PDF generation error:', error);
        res.status(500).json({ message: 'Failed to generate schedule PDF' });
    }
});
// Export PDF service as Firebase Function
exports.pdfService = functions.https.onRequest(pdfApp);
//# sourceMappingURL=pdf-service.js.map