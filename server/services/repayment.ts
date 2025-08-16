import { Offer } from "@shared/firestore-schema";
import { calculateRepaymentSchedule } from "@shared/calculations";
import { storage } from "../storage";

export class RepaymentService {
  /**
   * Updates offer with repayment schedule information when accepted
   */
  async initializeRepaymentSchedule(offer: Offer): Promise<void> {
    try {
      // Calculate the repayment schedule
      const loanTerms = {
        principal: parseFloat(offer.amount),
        interestRate: parseFloat(offer.interestRate),
        interestType: offer.interestType as 'fixed' | 'reducing',
        tenureValue: offer.tenureValue,
        tenureUnit: offer.tenureUnit as 'months' | 'years',
        repaymentType: offer.repaymentType as 'emi' | 'interest_only' | 'full_payment',
        repaymentFrequency: offer.repaymentFrequency || undefined,
        startDate: new Date(offer.startDate)
      };

      const schedule = calculateRepaymentSchedule(loanTerms);
      
      // Get the first payment due date
      const firstPayment = schedule.schedule[0];
      const nextPaymentDueDate = firstPayment ? new Date(firstPayment.dueDate) : null;

      // Update the offer with repayment schedule information
      await storage.updateOffer(offer.id, {
        nextPaymentDueDate,
        currentInstallmentNumber: 1,
        totalInstallments: schedule.numberOfPayments,
        dueDate: new Date(schedule.schedule[schedule.schedule.length - 1]?.dueDate || offer.dueDate) // Final payment date
      });

      console.log(`Initialized repayment schedule for offer ${offer.id}: ${schedule.numberOfPayments} payments, first due ${nextPaymentDueDate?.toLocaleDateString()}`);
    } catch (error) {
      console.error('Failed to initialize repayment schedule:', error);
      throw new Error('Failed to initialize repayment schedule');
    }
  }

  /**
   * Advances to the next installment when a payment is made
   */
  async advanceToNextInstallment(offerId: string, installmentNumber: number): Promise<void> {
    try {
      const offer = await storage.getOffer(offerId);
      if (!offer) {
        throw new Error('Offer not found');
      }

      // Calculate next installment details
      const loanTerms = {
        principal: parseFloat(offer.amount),
        interestRate: parseFloat(offer.interestRate),
        interestType: offer.interestType as 'fixed' | 'reducing',
        tenureValue: offer.tenureValue,
        tenureUnit: offer.tenureUnit as 'months' | 'years',
        repaymentType: offer.repaymentType as 'emi' | 'interest_only' | 'full_payment',
        repaymentFrequency: offer.repaymentFrequency || undefined,
        startDate: new Date(offer.startDate)
      };

      const schedule = calculateRepaymentSchedule(loanTerms);
      const nextInstallmentNumber = installmentNumber + 1;

      let updateData: any = {
        currentInstallmentNumber: nextInstallmentNumber
      };

      if (nextInstallmentNumber <= schedule.numberOfPayments) {
        // Find the next payment due date
        const nextPayment = schedule.schedule.find(p => p.installmentNumber === nextInstallmentNumber);
        if (nextPayment) {
          updateData.nextPaymentDueDate = new Date(nextPayment.dueDate);
        }
      } else {
        // All payments completed
        updateData.nextPaymentDueDate = null;
        updateData.status = 'completed';
      }

      await storage.updateOffer(offerId, updateData);

      console.log(`Advanced offer ${offerId} to installment ${nextInstallmentNumber}/${schedule.numberOfPayments}`);
    } catch (error) {
      console.error('Failed to advance installment:', error);
      throw new Error('Failed to advance to next installment');
    }
  }

  /**
   * Gets the current payment information for an offer
   */
  async getCurrentPaymentInfo(offerId: string): Promise<{
    currentInstallment: number;
    nextDueDate: Date | null;
    totalInstallments: number;
    expectedAmount: number;
    isOverdue: boolean;
  } | null> {
    try {
      const offer = await storage.getOffer(offerId);
      if (!offer || offer.status !== 'accepted') {
        return null;
      }

      // Calculate schedule to get expected amount
      const loanTerms = {
        principal: parseFloat(offer.amount),
        interestRate: parseFloat(offer.interestRate),
        interestType: offer.interestType as 'fixed' | 'reducing',
        tenureValue: offer.tenureValue,
        tenureUnit: offer.tenureUnit as 'months' | 'years',
        repaymentType: offer.repaymentType as 'emi' | 'interest_only' | 'full_payment',
        repaymentFrequency: offer.repaymentFrequency || undefined,
        startDate: new Date(offer.startDate)
      };

      const schedule = calculateRepaymentSchedule(loanTerms);
      const currentPayment = schedule.schedule.find(p => p.installmentNumber === (offer.currentInstallmentNumber || 1));
      
      const isOverdue = offer.nextPaymentDueDate ? new Date() > new Date(offer.nextPaymentDueDate) : false;

      return {
        currentInstallment: offer.currentInstallmentNumber || 1,
        nextDueDate: offer.nextPaymentDueDate,
        totalInstallments: offer.totalInstallments || schedule.numberOfPayments,
        expectedAmount: currentPayment?.totalAmount || 0,
        isOverdue
      };
    } catch (error) {
      console.error('Failed to get current payment info:', error);
      return null;
    }
  }

  /**
   * Updates overdue status for offers
   */
  async updateOverdueStatus(): Promise<void> {
    try {
      // Get all accepted offers with past due dates
      const offers = await storage.getOffersWithOverduePayments();
      
      for (const offer of offers) {
        if (offer.nextPaymentDueDate && new Date() > new Date(offer.nextPaymentDueDate)) {
          await storage.updateOffer(offer.id, { status: 'overdue' });
          console.log(`Marked offer ${offer.id} as overdue`);
        }
      }
    } catch (error) {
      console.error('Failed to update overdue status:', error);
    }
  }
}

export const repaymentService = new RepaymentService();