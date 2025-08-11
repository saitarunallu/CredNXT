export interface LoanTerms {
  principal: number;
  interestRate: number; // Annual percentage
  interestType: 'fixed' | 'reducing';
  tenureValue: number;
  tenureUnit: 'days' | 'weeks' | 'months' | 'years';
  repaymentType: 'emi' | 'interest_only' | 'full_payment';
  repaymentFrequency?: 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
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

// Calculate due dates based on start date and frequency
function calculateDueDates(startDate: Date, frequency: 'weekly' | 'monthly' | 'yearly', numberOfPayments: number): Date[] {
  const dueDates: Date[] = [];
  
  for (let i = 1; i <= numberOfPayments; i++) {
    const dueDate = new Date(startDate);
    
    switch (frequency) {
      case 'weekly':
        dueDate.setDate(startDate.getDate() + (i * 7));
        break;
      case 'monthly':
        dueDate.setMonth(startDate.getMonth() + i);
        // Handle month overflow (e.g., Jan 31 + 1 month = Feb 28/29)
        if (dueDate.getDate() !== startDate.getDate()) {
          dueDate.setDate(0); // Set to last day of previous month
        }
        break;
      case 'yearly':
        dueDate.setFullYear(startDate.getFullYear() + i);
        // Handle leap year edge case
        if (dueDate.getDate() !== startDate.getDate()) {
          dueDate.setDate(0); // Set to last day of previous month
        }
        break;
    }
    
    dueDates.push(dueDate);
  }
  
  return dueDates;
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
  const { principal, interestRate, interestType, tenureValue, tenureUnit, repaymentType, repaymentFrequency, startDate } = terms;
  
  const tenureInMonths = convertTenureToMonths(tenureValue, tenureUnit);
  const annualRate = interestRate / 100;
  
  if (repaymentType === 'full_payment') {
    // Simple interest calculation for full payment
    const totalInterest = interestType === 'fixed' 
      ? (principal * annualRate * tenureInMonths) / 12
      : (principal * annualRate * tenureInMonths) / 12; // Simplified reducing for full payment
    
    const finalDate = new Date(startDate);
    switch (tenureUnit) {
      case 'days':
        finalDate.setDate(startDate.getDate() + tenureValue);
        break;
      case 'weeks':
        finalDate.setDate(startDate.getDate() + (tenureValue * 7));
        break;
      case 'months':
        finalDate.setMonth(startDate.getMonth() + tenureValue);
        break;
      case 'years':
        finalDate.setFullYear(startDate.getFullYear() + tenureValue);
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
  
  // Calculate all due dates from start date
  const dueDates = calculateDueDates(startDate, frequency, numberOfPayments);
  
  const schedule: PaymentScheduleItem[] = [];
  let remainingBalance = principal;
  let totalInterest = 0;
  
  if (repaymentType === 'interest_only') {
    // Interest-only payments with principal at the end
    const interestPerPayment = (principal * annualRate * paymentFrequencyInMonths) / 12;
    
    for (let i = 1; i <= numberOfPayments; i++) {
      const dueDate = dueDates[i - 1];
      
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
        const dueDate = dueDates[i - 1];
        
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
        const dueDate = dueDates[i - 1];
        
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
    const paidForThisPayment = Math.min(totalPaid, payment.totalAmount);
    const remainingForThisPayment = payment.totalAmount - paidForThisPayment;
    
    if (remainingForThisPayment > 0.01) { // Using small tolerance for floating point
      return {
        nextDueDate: payment.dueDate,
        nextAmount: payment.totalAmount,
        remainingAmount: remainingForThisPayment,
        installmentNumber: payment.installmentNumber,
        principalAmount: payment.principalAmount,
        interestAmount: payment.interestAmount,
        isPartialPaid: paidForThisPayment > 0,
        paidAmount: paidForThisPayment
      };
    }
    
    totalPaid -= paidForThisPayment;
  }
  
  return null; // All payments completed
}

// Get payment status for each installment  
export function getPaymentStatus(terms: LoanTerms, paidAmount: number) {
  const schedule = calculateRepaymentSchedule(terms);
  let totalPaid = paidAmount;
  const paymentStatus = [];
  const today = new Date();
  
  for (const payment of schedule.schedule) {
    const paidForThisPayment = Math.min(totalPaid, payment.totalAmount);
    const remainingAmount = payment.totalAmount - paidForThisPayment;
    
    let status: 'paid' | 'partial' | 'pending' | 'overdue';
    
    if (remainingAmount <= 0.01) { // Using tolerance for floating point
      status = 'paid';
    } else if (paidForThisPayment > 0.01) {
      status = 'partial';
    } else {
      // Check if overdue based on due date
      status = payment.dueDate < today ? 'overdue' : 'pending';
    }
    
    paymentStatus.push({
      ...payment,
      status,
      paidAmount: Math.round(paidForThisPayment * 100) / 100,
      remainingAmount: Math.round(remainingAmount * 100) / 100
    });
    
    // Deduct the amount paid for this installment
    totalPaid = Math.max(0, totalPaid - paidForThisPayment);
  }
  
  return paymentStatus;
}

// Validate if a payment amount is valid for the current schedule
export function validatePaymentAmount(terms: LoanTerms, paidAmount: number, newPaymentAmount: number, allowPartPayment: boolean = false): {
  isValid: boolean;
  expectedAmount?: number;
  message?: string;
} {
  // Basic validation
  if (newPaymentAmount <= 0) {
    return {
      isValid: false,
      message: "Payment amount must be greater than zero"
    };
  }

  const schedule = calculateRepaymentSchedule(terms);
  const nextPayment = getNextPaymentInfo(terms, paidAmount);
  
  // Check if all payments are completed
  if (!nextPayment) {
    return {
      isValid: false,
      message: "All payments have been completed"
    };
  }

  // Check if payment exceeds the total remaining loan amount
  const totalLoanAmount = schedule.totalAmount;
  const remainingLoanAmount = totalLoanAmount - paidAmount;
  
  if (newPaymentAmount > remainingLoanAmount + 0.01) { // Small tolerance for rounding
    return {
      isValid: false,
      expectedAmount: Math.round(remainingLoanAmount * 100) / 100,
      message: `Payment cannot exceed remaining loan amount of ₹${remainingLoanAmount.toLocaleString()}`
    };
  }

  // For partial payments from previous installment, require completion first
  if (nextPayment.isPartialPaid && !allowPartPayment) {
    const requiredAmount = nextPayment.remainingAmount;
    if (Math.abs(newPaymentAmount - requiredAmount) > 0.01) {
      return {
        isValid: false,
        expectedAmount: Math.round(requiredAmount * 100) / 100,
        message: `Complete installment #${nextPayment.installmentNumber} with ₹${requiredAmount.toLocaleString()}`
      };
    }
  }

  // EMI specific validation
  if (terms.repaymentType === 'emi' && !nextPayment.isPartialPaid) {
    const emiAmount = schedule.emiAmount!;
    
    if (!allowPartPayment) {
      // Strict EMI: must pay exact amount
      if (Math.abs(newPaymentAmount - emiAmount) > 0.01) {
        return {
          isValid: false,
          expectedAmount: Math.round(emiAmount * 100) / 100,
          message: `EMI #${nextPayment.installmentNumber} should be exactly ₹${emiAmount.toLocaleString()}`
        };
      }
    } else {
      // Flexible EMI: can pay partial but not exceed
      if (newPaymentAmount > emiAmount + 0.01) {
        return {
          isValid: false,
          expectedAmount: Math.round(emiAmount * 100) / 100,
          message: `Payment cannot exceed EMI amount of ₹${emiAmount.toLocaleString()}`
        };
      }
    }
  }

  // For other payment types, validate against next installment
  if (terms.repaymentType !== 'emi' && !allowPartPayment && !nextPayment.isPartialPaid) {
    if (Math.abs(newPaymentAmount - nextPayment.nextAmount) > 0.01) {
      return {
        isValid: false,
        expectedAmount: Math.round(nextPayment.nextAmount * 100) / 100,
        message: `Payment #${nextPayment.installmentNumber} should be exactly ₹${nextPayment.nextAmount.toLocaleString()}`
      };
    }
  }

  // Additional validation for partial payments
  if (allowPartPayment && newPaymentAmount > nextPayment.remainingAmount + 0.01) {
    return {
      isValid: false,
      expectedAmount: Math.round(nextPayment.remainingAmount * 100) / 100,
      message: `Payment cannot exceed installment amount of ₹${nextPayment.remainingAmount.toLocaleString()}`
    };
  }

  return { isValid: true };
}