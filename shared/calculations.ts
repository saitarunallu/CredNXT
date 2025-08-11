export interface LoanTerms {
  principal: number;
  interestRate: number; // Annual percentage
  interestType: 'fixed' | 'reducing';
  tenureValue: number;
  tenureUnit: 'days' | 'weeks' | 'months' | 'years';
  repaymentType: 'emi' | 'interest_only' | 'full_payment';
  repaymentFrequency?: 'weekly' | 'monthly' | 'yearly';
}

export interface RepaymentSchedule {
  totalAmount: number;
  totalInterest: number;
  emiAmount?: number;
  numberOfPayments: number;
  schedule: PaymentScheduleItem[];
}

export interface PaymentScheduleItem {
  installmentNumber: number;
  dueDate: Date;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  remainingBalance: number;
}

// Convert tenure to months for calculation
function convertTenureToMonths(tenureValue: number, tenureUnit: string): number {
  switch (tenureUnit) {
    case 'days':
      return tenureValue / 30; // Approximate
    case 'weeks':
      return tenureValue / 4.33; // Approximate
    case 'months':
      return tenureValue;
    case 'years':
      return tenureValue * 12;
    default:
      return tenureValue;
  }
}

// Get payment frequency in months
function getPaymentFrequencyInMonths(frequency: string): number {
  switch (frequency) {
    case 'weekly':
      return 1/4.33; // Approximate
    case 'monthly':
      return 1;
    case 'yearly':
      return 12;
    default:
      return 1;
  }
}

// Calculate EMI using standard formula
function calculateEMI(principal: number, monthlyRate: number, numberOfPayments: number): number {
  if (monthlyRate === 0) {
    return principal / numberOfPayments;
  }
  
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
              (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  return Math.round(emi * 100) / 100;
}

// Generate repayment schedule
export function calculateRepaymentSchedule(terms: LoanTerms): RepaymentSchedule {
  const { principal, interestRate, interestType, tenureValue, tenureUnit, repaymentType, repaymentFrequency } = terms;
  
  const tenureInMonths = convertTenureToMonths(tenureValue, tenureUnit);
  const annualRate = interestRate / 100;
  
  if (repaymentType === 'full_payment') {
    // Simple interest calculation for full payment
    const totalInterest = interestType === 'fixed' 
      ? (principal * annualRate * tenureInMonths) / 12
      : (principal * annualRate * tenureInMonths) / 12; // Simplified reducing for full payment
    
    const finalDate = new Date();
    switch (tenureUnit) {
      case 'days':
        finalDate.setDate(finalDate.getDate() + tenureValue);
        break;
      case 'weeks':
        finalDate.setDate(finalDate.getDate() + (tenureValue * 7));
        break;
      case 'months':
        finalDate.setMonth(finalDate.getMonth() + tenureValue);
        break;
      case 'years':
        finalDate.setFullYear(finalDate.getFullYear() + tenureValue);
        break;
    }
    
    return {
      totalAmount: principal + totalInterest,
      totalInterest,
      numberOfPayments: 1,
      schedule: [{
        installmentNumber: 1,
        dueDate: finalDate,
        principalAmount: principal,
        interestAmount: totalInterest,
        totalAmount: principal + totalInterest,
        remainingBalance: 0
      }]
    };
  }

  // For EMI and interest-only payments
  const frequency = repaymentFrequency || 'monthly';
  const paymentFrequencyInMonths = getPaymentFrequencyInMonths(frequency);
  const numberOfPayments = Math.ceil(tenureInMonths / paymentFrequencyInMonths);
  
  const schedule: PaymentScheduleItem[] = [];
  let remainingBalance = principal;
  let totalInterest = 0;
  
  if (repaymentType === 'interest_only') {
    // Interest-only payments with principal at the end
    const interestPerPayment = (principal * annualRate * paymentFrequencyInMonths) / 12;
    
    for (let i = 1; i <= numberOfPayments; i++) {
      const dueDate = new Date();
      switch (frequency) {
        case 'weekly':
          dueDate.setDate(dueDate.getDate() + (i * 7));
          break;
        case 'monthly':
          dueDate.setMonth(dueDate.getMonth() + i);
          break;
        case 'yearly':
          dueDate.setFullYear(dueDate.getFullYear() + i);
          break;
      }
      
      const isLastPayment = i === numberOfPayments;
      const principalAmount = isLastPayment ? principal : 0;
      const interestAmount = Math.round(interestPerPayment * 100) / 100;
      
      totalInterest += interestAmount;
      
      schedule.push({
        installmentNumber: i,
        dueDate,
        principalAmount,
        interestAmount,
        totalAmount: principalAmount + interestAmount,
        remainingBalance: isLastPayment ? 0 : principal
      });
    }
  } else if (repaymentType === 'emi') {
    // Standard EMI calculation
    if (interestType === 'fixed') {
      // Fixed rate EMI - treat as simple interest divided equally
      const totalInterest = (principal * annualRate * tenureInMonths) / 12;
      const emiAmount = (principal + totalInterest) / numberOfPayments;
      
      for (let i = 1; i <= numberOfPayments; i++) {
        const dueDate = new Date();
        switch (frequency) {
          case 'weekly':
            dueDate.setDate(dueDate.getDate() + (i * 7));
            break;
          case 'monthly':
            dueDate.setMonth(dueDate.getMonth() + i);
            break;
          case 'yearly':
            dueDate.setFullYear(dueDate.getFullYear() + i);
            break;
        }
        
        const principalAmount = principal / numberOfPayments;
        const interestAmount = totalInterest / numberOfPayments;
        remainingBalance -= principalAmount;
        
        schedule.push({
          installmentNumber: i,
          dueDate,
          principalAmount: Math.round(principalAmount * 100) / 100,
          interestAmount: Math.round(interestAmount * 100) / 100,
          totalAmount: Math.round(emiAmount * 100) / 100,
          remainingBalance: Math.max(0, Math.round(remainingBalance * 100) / 100)
        });
      }
    } else {
      // Reducing balance EMI
      const monthlyRate = annualRate / 12 * paymentFrequencyInMonths;
      const emiAmount = calculateEMI(principal, monthlyRate, numberOfPayments);
      
      for (let i = 1; i <= numberOfPayments; i++) {
        const dueDate = new Date();
        switch (frequency) {
          case 'weekly':
            dueDate.setDate(dueDate.getDate() + (i * 7));
            break;
          case 'monthly':
            dueDate.setMonth(dueDate.getMonth() + i);
            break;
          case 'yearly':
            dueDate.setFullYear(dueDate.getFullYear() + i);
            break;
        }
        
        const interestAmount = Math.round(remainingBalance * monthlyRate * 100) / 100;
        const principalAmount = Math.round((emiAmount - interestAmount) * 100) / 100;
        remainingBalance = Math.max(0, remainingBalance - principalAmount);
        totalInterest += interestAmount;
        
        schedule.push({
          installmentNumber: i,
          dueDate,
          principalAmount,
          interestAmount,
          totalAmount: emiAmount,
          remainingBalance: Math.round(remainingBalance * 100) / 100
        });
      }
    }
  }

  return {
    totalAmount: principal + totalInterest,
    totalInterest: Math.round(totalInterest * 100) / 100,
    emiAmount: repaymentType === 'emi' ? schedule[0]?.totalAmount : undefined,
    numberOfPayments,
    schedule
  };
}

// Calculate next payment due date and amount
export function getNextPaymentInfo(terms: LoanTerms, paidAmount: number) {
  const schedule = calculateRepaymentSchedule(terms);
  let totalPaid = paidAmount;
  
  for (const payment of schedule.schedule) {
    if (totalPaid >= payment.totalAmount) {
      totalPaid -= payment.totalAmount;
    } else {
      return {
        nextDueDate: payment.dueDate,
        nextAmount: payment.totalAmount,
        remainingAmount: payment.totalAmount - totalPaid,
        installmentNumber: payment.installmentNumber
      };
    }
  }
  
  return null; // All payments completed
}

// Validate if a payment amount is valid for the current schedule
export function validatePaymentAmount(terms: LoanTerms, paidAmount: number, newPaymentAmount: number): {
  isValid: boolean;
  expectedAmount?: number;
  message?: string;
} {
  const nextPayment = getNextPaymentInfo(terms, paidAmount);
  
  if (!nextPayment) {
    return {
      isValid: false,
      message: "All payments have been completed"
    };
  }
  
  if (terms.repaymentType === 'emi' && newPaymentAmount !== nextPayment.remainingAmount) {
    return {
      isValid: false,
      expectedAmount: nextPayment.remainingAmount,
      message: `EMI payment should be exactly ₹${nextPayment.remainingAmount.toLocaleString()}`
    };
  }
  
  if (newPaymentAmount > nextPayment.remainingAmount) {
    return {
      isValid: false,
      expectedAmount: nextPayment.remainingAmount,
      message: `Payment amount cannot exceed ₹${nextPayment.remainingAmount.toLocaleString()}`
    };
  }
  
  return { isValid: true };
}