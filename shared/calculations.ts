export interface LoanTerms {
  principal: number;
  interestRate: number; // Annual percentage
  interestType: 'fixed' | 'reducing';
  tenureValue: number;
  tenureUnit: 'days' | 'weeks' | 'months' | 'years';
  repaymentType: 'emi' | 'interest_only' | 'full_payment' | 'step_down' | 'step_up' | 'balloon';
  repaymentFrequency?: 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'yearly';
  startDate: Date;
  gracePeriodDays?: number; // Grace period for late payments
  prepaymentPenalty?: number; // Percentage penalty for early repayment
  latePaymentPenalty?: number; // Percentage penalty for late payments
  compoundingFrequency?: 'daily' | 'monthly' | 'quarterly' | 'annually'; // For reducing balance
}

export interface RepaymentSchedule {
  totalAmount: number;
  totalInterest: number;
  emiAmount?: number;
  numberOfPayments: number;
  effectiveAnnualRate: number; // APR including all fees and charges
  totalCostOfCredit: number; // Total cost including all charges
  schedule: PaymentScheduleItem[];
  amortizationSummary: {
    totalPrincipal: number;
    totalInterest: number;
    averagePayment: number;
    interestToIncomeRatio?: number;
  };
}

export interface PaymentScheduleItem {
  installmentNumber: number;
  dueDate: Date;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  remainingBalance: number;
  cumulativePrincipal: number;
  cumulativeInterest: number;
  principalPercentage: number; // Percentage of payment going to principal
  interestPercentage: number; // Percentage of payment going to interest
  gracePeriodEndDate?: Date; // End of grace period for this payment
  latePaymentFee?: number; // Late payment penalty if applicable
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
      return 1/4.33; // Approximate weeks per month
    case 'bi_weekly':
      return 1/2.17; // Approximate bi-weeks per month
    case 'monthly':
      return 1;
    case 'quarterly':
      return 3;
    case 'semi_annual':
      return 6;
    case 'yearly':
      return 12;
    default:
      return 1;
  }
}

// Calculate due dates based on start date and frequency
function calculateDueDates(startDate: Date, frequency: 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'yearly', numberOfPayments: number): Date[] {
  const dueDates: Date[] = [];
  
  for (let i = 1; i <= numberOfPayments; i++) {
    const dueDate = new Date(startDate);
    
    switch (frequency) {
      case 'weekly':
        dueDate.setDate(startDate.getDate() + (i * 7));
        break;
      case 'bi_weekly':
        dueDate.setDate(startDate.getDate() + (i * 14));
        break;
      case 'monthly':
        dueDate.setMonth(startDate.getMonth() + i);
        // Handle month overflow (e.g., Jan 31 + 1 month = Feb 28/29)
        if (dueDate.getDate() !== startDate.getDate()) {
          dueDate.setDate(0); // Set to last day of previous month
        }
        break;
      case 'quarterly':
        dueDate.setMonth(startDate.getMonth() + (i * 3));
        if (dueDate.getDate() !== startDate.getDate()) {
          dueDate.setDate(0);
        }
        break;
      case 'semi_annual':
        dueDate.setMonth(startDate.getMonth() + (i * 6));
        if (dueDate.getDate() !== startDate.getDate()) {
          dueDate.setDate(0);
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

// Calculate effective annual rate (APR)
function calculateEffectiveAnnualRate(nominalRate: number, compoundingPerYear: number): number {
  return Math.pow(1 + nominalRate / compoundingPerYear, compoundingPerYear) - 1;
}

// Calculate step-up/step-down EMI based on percentage increase/decrease
function calculateStepEMI(baseEMI: number, stepPercentage: number, installmentNumber: number, isStepUp: boolean): number {
  const multiplier = isStepUp ? (1 + stepPercentage / 100) : (1 - stepPercentage / 100);
  return Math.round(baseEMI * Math.pow(multiplier, installmentNumber - 1) * 100) / 100;
}

// Calculate grace period end date
function calculateGracePeriodEndDate(dueDate: Date, gracePeriodDays: number): Date {
  const graceEndDate = new Date(dueDate);
  graceEndDate.setDate(dueDate.getDate() + gracePeriodDays);
  return graceEndDate;
}

// Calculate late payment fee
function calculateLatePaymentFee(paymentAmount: number, latePaymentPenalty: number): number {
  if (!latePaymentPenalty) return 0;
  return Math.round(paymentAmount * (latePaymentPenalty / 100) * 100) / 100;
}

// Generate repayment schedule
export function calculateRepaymentSchedule(terms: LoanTerms): RepaymentSchedule {
  const { 
    principal, 
    interestRate, 
    interestType, 
    tenureValue, 
    tenureUnit, 
    repaymentType, 
    repaymentFrequency, 
    startDate,
    gracePeriodDays = 0,
    latePaymentPenalty = 0,
    compoundingFrequency = 'monthly'
  } = terms;
  
  const tenureInMonths = convertTenureToMonths(tenureValue, tenureUnit);
  const annualRate = interestRate / 100;
  
  // For full payment
  if (repaymentType === 'full_payment') {
    const totalInterest = interestType === 'fixed' 
      ? (principal * annualRate * tenureInMonths) / 12
      : (principal * annualRate * tenureInMonths) / 12;
    
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
    
    const gracePeriodEndDate = gracePeriodDays > 0 ? calculateGracePeriodEndDate(finalDate, gracePeriodDays) : undefined;
    const latePaymentFee = calculateLatePaymentFee(principal + totalInterest, latePaymentPenalty);
    
    const totalAmount = principal + totalInterest;
    const effectiveRate = calculateEffectiveAnnualRate(annualRate, compoundingFrequency === 'monthly' ? 12 : 4);
    
    return {
      totalAmount,
      totalInterest,
      numberOfPayments: 1,
      effectiveAnnualRate: effectiveRate * 100,
      totalCostOfCredit: totalAmount,
      amortizationSummary: {
        totalPrincipal: principal,
        totalInterest,
        averagePayment: totalAmount,
      },
      schedule: [{
        installmentNumber: 1,
        dueDate: finalDate,
        principalAmount: principal,
        interestAmount: totalInterest,
        totalAmount,
        remainingBalance: 0,
        cumulativePrincipal: principal,
        cumulativeInterest: totalInterest,
        principalPercentage: (principal / totalAmount) * 100,
        interestPercentage: (totalInterest / totalAmount) * 100,
        gracePeriodEndDate,
        latePaymentFee: latePaymentFee > 0 ? latePaymentFee : undefined
      }]
    };
  }

  // For all other payment types
  const frequency = repaymentFrequency || 'monthly';
  const paymentFrequencyInMonths = getPaymentFrequencyInMonths(frequency);
  const numberOfPayments = Math.ceil(tenureInMonths / paymentFrequencyInMonths);
  
  const dueDates = calculateDueDates(startDate, frequency, numberOfPayments);
  
  const schedule: PaymentScheduleItem[] = [];
  let remainingBalance = principal;
  let totalInterest = 0;
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;
  
  if (repaymentType === 'interest_only') {
    const interestPerPayment = (principal * annualRate * paymentFrequencyInMonths) / 12;
    
    for (let i = 1; i <= numberOfPayments; i++) {
      const dueDate = dueDates[i - 1];
      const isLastPayment = i === numberOfPayments;
      const principalAmount = isLastPayment ? principal : 0;
      const interestAmount = Math.round(interestPerPayment * 100) / 100;
      const totalPayment = principalAmount + interestAmount;
      
      cumulativePrincipal += principalAmount;
      cumulativeInterest += interestAmount;
      totalInterest += interestAmount;
      
      const gracePeriodEndDate = gracePeriodDays > 0 ? calculateGracePeriodEndDate(dueDate, gracePeriodDays) : undefined;
      const latePaymentFee = calculateLatePaymentFee(totalPayment, latePaymentPenalty);
      
      schedule.push({
        installmentNumber: i,
        dueDate,
        principalAmount,
        interestAmount,
        totalAmount: totalPayment,
        remainingBalance: isLastPayment ? 0 : principal,
        cumulativePrincipal,
        cumulativeInterest,
        principalPercentage: totalPayment > 0 ? (principalAmount / totalPayment) * 100 : 0,
        interestPercentage: totalPayment > 0 ? (interestAmount / totalPayment) * 100 : 0,
        gracePeriodEndDate,
        latePaymentFee: latePaymentFee > 0 ? latePaymentFee : undefined
      });
    }
  } else if (repaymentType === 'emi') {
    if (interestType === 'fixed') {
      const totalInterestCalculated = (principal * annualRate * tenureInMonths) / 12;
      const emiAmount = (principal + totalInterestCalculated) / numberOfPayments;
      
      for (let i = 1; i <= numberOfPayments; i++) {
        const dueDate = dueDates[i - 1];
        const principalAmount = principal / numberOfPayments;
        const interestAmount = totalInterestCalculated / numberOfPayments;
        
        remainingBalance -= principalAmount;
        cumulativePrincipal += principalAmount;
        cumulativeInterest += interestAmount;
        totalInterest += interestAmount;
        
        const gracePeriodEndDate = gracePeriodDays > 0 ? calculateGracePeriodEndDate(dueDate, gracePeriodDays) : undefined;
        const latePaymentFee = calculateLatePaymentFee(emiAmount, latePaymentPenalty);
        
        schedule.push({
          installmentNumber: i,
          dueDate,
          principalAmount: Math.round(principalAmount * 100) / 100,
          interestAmount: Math.round(interestAmount * 100) / 100,
          totalAmount: Math.round(emiAmount * 100) / 100,
          remainingBalance: Math.max(0, Math.round(remainingBalance * 100) / 100),
          cumulativePrincipal: Math.round(cumulativePrincipal * 100) / 100,
          cumulativeInterest: Math.round(cumulativeInterest * 100) / 100,
          principalPercentage: (principalAmount / emiAmount) * 100,
          interestPercentage: (interestAmount / emiAmount) * 100,
          gracePeriodEndDate,
          latePaymentFee: latePaymentFee > 0 ? latePaymentFee : undefined
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
        cumulativePrincipal += principalAmount;
        cumulativeInterest += interestAmount;
        totalInterest += interestAmount;
        
        const gracePeriodEndDate = gracePeriodDays > 0 ? calculateGracePeriodEndDate(dueDate, gracePeriodDays) : undefined;
        const latePaymentFee = calculateLatePaymentFee(emiAmount, latePaymentPenalty);
        
        schedule.push({
          installmentNumber: i,
          dueDate,
          principalAmount,
          interestAmount,
          totalAmount: emiAmount,
          remainingBalance: Math.round(remainingBalance * 100) / 100,
          cumulativePrincipal: Math.round(cumulativePrincipal * 100) / 100,
          cumulativeInterest: Math.round(cumulativeInterest * 100) / 100,
          principalPercentage: (principalAmount / emiAmount) * 100,
          interestPercentage: (interestAmount / emiAmount) * 100,
          gracePeriodEndDate,
          latePaymentFee: latePaymentFee > 0 ? latePaymentFee : undefined
        });
      }
    }
  } else if (repaymentType === 'step_up' || repaymentType === 'step_down') {
    // Step-up/Step-down EMI (5% annual increase/decrease by default)
    const monthlyRate = annualRate / 12 * paymentFrequencyInMonths;
    const baseEMI = calculateEMI(principal, monthlyRate, numberOfPayments) * 0.8; // Start lower for step-up
    const stepPercentage = 5; // 5% step annually (can be made configurable)
    
    for (let i = 1; i <= numberOfPayments; i++) {
      const dueDate = dueDates[i - 1];
      const currentEMI = calculateStepEMI(baseEMI, stepPercentage, i, repaymentType === 'step_up');
      const interestAmount = Math.round(remainingBalance * monthlyRate * 100) / 100;
      const principalAmount = Math.round((currentEMI - interestAmount) * 100) / 100;
      
      remainingBalance = Math.max(0, remainingBalance - principalAmount);
      cumulativePrincipal += principalAmount;
      cumulativeInterest += interestAmount;
      totalInterest += interestAmount;
      
      const gracePeriodEndDate = gracePeriodDays > 0 ? calculateGracePeriodEndDate(dueDate, gracePeriodDays) : undefined;
      const latePaymentFee = calculateLatePaymentFee(currentEMI, latePaymentPenalty);
      
      schedule.push({
        installmentNumber: i,
        dueDate,
        principalAmount,
        interestAmount,
        totalAmount: currentEMI,
        remainingBalance: Math.round(remainingBalance * 100) / 100,
        cumulativePrincipal: Math.round(cumulativePrincipal * 100) / 100,
        cumulativeInterest: Math.round(cumulativeInterest * 100) / 100,
        principalPercentage: (principalAmount / currentEMI) * 100,
        interestPercentage: (interestAmount / currentEMI) * 100,
        gracePeriodEndDate,
        latePaymentFee: latePaymentFee > 0 ? latePaymentFee : undefined
      });
    }
  } else if (repaymentType === 'balloon') {
    // Balloon payment: Lower EMIs with large final payment
    const monthlyRate = annualRate / 12 * paymentFrequencyInMonths;
    const balloonPercentage = 30; // 30% of principal as balloon payment
    const balloonAmount = principal * (balloonPercentage / 100);
    const adjustedPrincipal = principal - balloonAmount;
    const regularEMI = calculateEMI(adjustedPrincipal, monthlyRate, numberOfPayments - 1);
    
    for (let i = 1; i <= numberOfPayments; i++) {
      const dueDate = dueDates[i - 1];
      const isLastPayment = i === numberOfPayments;
      const currentEMI = isLastPayment ? regularEMI + balloonAmount : regularEMI;
      const interestAmount = Math.round(remainingBalance * monthlyRate * 100) / 100;
      const principalAmount = Math.round((currentEMI - interestAmount) * 100) / 100;
      
      remainingBalance = Math.max(0, remainingBalance - principalAmount);
      cumulativePrincipal += principalAmount;
      cumulativeInterest += interestAmount;
      totalInterest += interestAmount;
      
      const gracePeriodEndDate = gracePeriodDays > 0 ? calculateGracePeriodEndDate(dueDate, gracePeriodDays) : undefined;
      const latePaymentFee = calculateLatePaymentFee(currentEMI, latePaymentPenalty);
      
      schedule.push({
        installmentNumber: i,
        dueDate,
        principalAmount,
        interestAmount,
        totalAmount: currentEMI,
        remainingBalance: Math.round(remainingBalance * 100) / 100,
        cumulativePrincipal: Math.round(cumulativePrincipal * 100) / 100,
        cumulativeInterest: Math.round(cumulativeInterest * 100) / 100,
        principalPercentage: (principalAmount / currentEMI) * 100,
        interestPercentage: (interestAmount / currentEMI) * 100,
        gracePeriodEndDate,
        latePaymentFee: latePaymentFee > 0 ? latePaymentFee : undefined
      });
    }
  }

  const totalAmount = principal + totalInterest;
  const averagePayment = schedule.reduce((sum, item) => sum + item.totalAmount, 0) / numberOfPayments;
  const effectiveRate = calculateEffectiveAnnualRate(annualRate, compoundingFrequency === 'monthly' ? 12 : 4);
  
  return {
    totalAmount,
    totalInterest: Math.round(totalInterest * 100) / 100,
    emiAmount: repaymentType.includes('emi') || repaymentType === 'step_up' || repaymentType === 'step_down' || repaymentType === 'balloon' 
      ? schedule[0]?.totalAmount : undefined,
    numberOfPayments,
    effectiveAnnualRate: effectiveRate * 100,
    totalCostOfCredit: totalAmount,
    amortizationSummary: {
      totalPrincipal: principal,
      totalInterest: Math.round(totalInterest * 100) / 100,
      averagePayment: Math.round(averagePayment * 100) / 100,
    },
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

// Get payment status for each installment - Banking Industry Standard
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

// Calculate Outstanding Principal Balance - Banking Industry Standard
export function calculateOutstandingPrincipal(terms: LoanTerms, paidAmount: number): {
  outstandingPrincipal: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  dueAmount: number;
  overDueAmount: number;
} {
  const schedule = calculateRepaymentSchedule(terms);
  let remainingPaid = paidAmount;
  let totalPrincipalPaid = 0;
  let totalInterestPaid = 0;
  let dueAmount = 0;
  let overDueAmount = 0;
  const today = new Date();
  
  // Process payments in chronological order
  for (const payment of schedule.schedule) {
    const paymentDueDate = new Date(payment.dueDate);
    const paidForThisPayment = Math.min(remainingPaid, payment.totalAmount);
    const remainingForThisPayment = payment.totalAmount - paidForThisPayment;
    
    if (paidForThisPayment > 0) {
      // Allocate payment between interest and principal
      const interestPaidForThis = Math.min(paidForThisPayment, payment.interestAmount);
      const principalPaidForThis = Math.max(0, paidForThisPayment - payment.interestAmount);
      
      totalInterestPaid += interestPaidForThis;
      totalPrincipalPaid += principalPaidForThis;
    }
    
    // Calculate due and overdue amounts
    if (remainingForThisPayment > 0.01) {
      if (paymentDueDate <= today) {
        // Payment is due or overdue
        if (paymentDueDate < today) {
          overDueAmount += remainingForThisPayment;
        } else {
          dueAmount += remainingForThisPayment;
        }
      }
    }
    
    remainingPaid = Math.max(0, remainingPaid - paidForThisPayment);
    if (remainingPaid <= 0) break;
  }
  
  const outstandingPrincipal = terms.principal - totalPrincipalPaid;
  
  return {
    outstandingPrincipal: Math.round(outstandingPrincipal * 100) / 100,
    totalPrincipalPaid: Math.round(totalPrincipalPaid * 100) / 100,
    totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
    dueAmount: Math.round(dueAmount * 100) / 100,
    overDueAmount: Math.round(overDueAmount * 100) / 100
  };
}

// Enhanced payment validation with support for new repayment types
export function validatePaymentAmount(terms: LoanTerms, paidAmount: number, newPaymentAmount: number, allowPartPayment: boolean = false): {
  isValid: boolean;
  expectedAmount?: number;
  message?: string;
  isEarlyPayment?: boolean;
  prepaymentPenalty?: number;
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

  // Check for early/full prepayment
  const isEarlyPayment = newPaymentAmount >= remainingLoanAmount * 0.5; // 50% or more of remaining amount
  let prepaymentPenalty = 0;
  
  if (isEarlyPayment && terms.prepaymentPenalty && terms.prepaymentPenalty > 0) {
    prepaymentPenalty = (remainingLoanAmount * terms.prepaymentPenalty) / 100;
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

  // Enhanced validation for different repayment types
  const repaymentTypeValidation = validateRepaymentTypeSpecific(terms, nextPayment, newPaymentAmount, allowPartPayment, schedule);
  if (!repaymentTypeValidation.isValid) {
    return repaymentTypeValidation;
  }

  return { 
    isValid: true, 
    isEarlyPayment,
    prepaymentPenalty: prepaymentPenalty > 0 ? prepaymentPenalty : undefined
  };
}

// Specific validation for different repayment types
function validateRepaymentTypeSpecific(terms: LoanTerms, nextPayment: any, newPaymentAmount: number, allowPartPayment: boolean, schedule: RepaymentSchedule) {
  const { repaymentType } = terms;
  
  // For EMI, step-up, step-down, and balloon payments - enforce exact payment amounts
  if ((repaymentType === 'emi' || repaymentType === 'step_up' || repaymentType === 'step_down' || repaymentType === 'balloon') && !nextPayment.isPartialPaid) {
    const expectedAmount = nextPayment.nextAmount;
    
    if (!allowPartPayment) {
      if (Math.abs(newPaymentAmount - expectedAmount) > 0.01) {
        const paymentTypeLabel = repaymentType === 'emi' ? 'EMI' : repaymentType.replace('_', '-') + ' payment';
        return {
          isValid: false,
          expectedAmount: Math.round(expectedAmount * 100) / 100,
          message: `${paymentTypeLabel} #${nextPayment.installmentNumber} should be exactly ₹${expectedAmount.toLocaleString()}`
        };
      }
    } else {
      if (newPaymentAmount > expectedAmount + 0.01) {
        return {
          isValid: false,
          expectedAmount: Math.round(expectedAmount * 100) / 100,
          message: `Payment cannot exceed installment amount of ₹${expectedAmount.toLocaleString()}`
        };
      }
    }
  } else if (repaymentType === 'interest_only' && !allowPartPayment && !nextPayment.isPartialPaid) {
    if (Math.abs(newPaymentAmount - nextPayment.nextAmount) > 0.01) {
      return {
        isValid: false,
        expectedAmount: Math.round(nextPayment.nextAmount * 100) / 100,
        message: `Interest payment #${nextPayment.installmentNumber} should be exactly ₹${nextPayment.nextAmount.toLocaleString()}`
      };
    }
  } else if (repaymentType === 'full_payment') {
    // For full payment, must pay the complete remaining amount
    if (Math.abs(newPaymentAmount - nextPayment.nextAmount) > 0.01) {
      return {
        isValid: false,
        expectedAmount: Math.round(nextPayment.nextAmount * 100) / 100,
        message: `Full payment must be exactly ₹${nextPayment.nextAmount.toLocaleString()}`
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

// Calculate late payment fee for overdue payments
export function calculateLatePaymentFeeForOverdue(terms: LoanTerms, paymentAmount: number, daysPastDue: number): number {
  if (!terms.latePaymentPenalty || daysPastDue <= (terms.gracePeriodDays || 0)) {
    return 0;
  }
  
  const effectiveDaysOverdue = daysPastDue - (terms.gracePeriodDays || 0);
  const baseFee = calculateLatePaymentFee(paymentAmount, terms.latePaymentPenalty);
  
  // Apply progressive penalty (higher fees for longer delays)
  const progressiveMultiplier = Math.min(1 + (effectiveDaysOverdue / 30) * 0.1, 2); // Max 2x penalty
  
  return Math.round(baseFee * progressiveMultiplier * 100) / 100;
}

// Get comprehensive payment insights for borrowers
export function getPaymentInsights(terms: LoanTerms, paidAmount: number) {
  const schedule = calculateRepaymentSchedule(terms);
  const paymentStatus = getPaymentStatus(terms, paidAmount);
  const nextPayment = getNextPaymentInfo(terms, paidAmount);
  
  const completedPayments = paymentStatus.filter(p => p.status === 'paid').length;
  const overduePayments = paymentStatus.filter(p => p.status === 'overdue').length;
  const totalPaidPrincipal = paymentStatus.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  
  const progressPercentage = (paidAmount / schedule.totalAmount) * 100;
  const principalProgressPercentage = (totalPaidPrincipal / terms.principal) * 100;
  
  return {
    schedule,
    paymentStatus,
    nextPayment,
    summary: {
      totalLoanAmount: schedule.totalAmount,
      totalPaid: paidAmount,
      remainingBalance: schedule.totalAmount - paidAmount,
      completedPayments,
      overduePayments,
      totalPayments: schedule.numberOfPayments,
      progressPercentage: Math.round(progressPercentage * 100) / 100,
      principalProgressPercentage: Math.round(principalProgressPercentage * 100) / 100,
      effectiveAnnualRate: schedule.effectiveAnnualRate,
      averagePayment: schedule.amortizationSummary.averagePayment
    }
  };
}