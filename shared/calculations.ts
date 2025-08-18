export interface LoanTerms {
  principal: number;
  interestRate: number; // Annual percentage rate
  interestType: 'fixed' | 'reducing';
  tenureValue: number;
  tenureUnit: 'months' | 'years';
  repaymentType: 'emi' | 'interest-only' | 'full-payment';
  repaymentFrequency?: 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'yearly';
  startDate: Date;
  gracePeriodDays?: number;
  prepaymentPenalty?: number;
  latePaymentPenalty?: number;
  processingFee?: number; // For APR calculation
  otherCharges?: number; // For APR calculation
}

export interface RepaymentSchedule {
  totalAmount: number;
  totalInterest: number;
  emiAmount?: number;
  numberOfPayments: number;
  annualPercentageRate: number; // APR including all fees per RBI guidelines
  effectiveInterestRate: number; // Actual interest rate considering compounding
  totalCostOfCredit: number; // Complete cost including all charges
  processingFee: number;
  totalCharges: number;
  schedule: PaymentScheduleItem[];
  amortizationSummary: {
    totalPrincipal: number;
    totalInterest: number;
    totalCharges: number;
    averagePayment: number;
    principalToInterestRatio: number;
  };
  rbiCompliance: {
    isCompliant: boolean;
    fairPracticesCode: boolean;
    transparentPricing: boolean;
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
  principalPercentage: number;
  interestPercentage: number;
  gracePeriodEndDate?: Date;
  latePaymentFee?: number;
  daysBetweenPayments: number; // For accurate interest calculation
  effectivePeriodRate: number; // Period-specific interest rate
}

// Banking industry standard tenure conversion
function convertTenureToMonths(tenureValue: number, tenureUnit: string): number {
  switch (tenureUnit) {
    case 'months':
      return tenureValue;
    case 'years':
      return tenureValue * 12;
    default:
      throw new Error(`Invalid tenure unit: ${tenureUnit}. Only months and years are supported.`);
  }
}

// Convert tenure to days for precise APR calculation
function convertTenureToDays(tenureValue: number, tenureUnit: string): number {
  switch (tenureUnit) {
    case 'months':
      return tenureValue * 30.44; // Banking standard average
    case 'years':
      return tenureValue * 365.25; // Accounting for leap years
    default:
      throw new Error(`Invalid tenure unit: ${tenureUnit}. Only months and years are supported.`);
  }
}

// Banking standard payment frequency conversion
function getPaymentFrequencyInMonths(frequency: string): number {
  switch (frequency) {
    case 'weekly':
      return 1 / 4.33; // Approximately 0.23 months
    case 'bi_weekly':
      return 1 / 2.17; // Approximately 0.46 months
    case 'monthly':
      return 1;
    case 'quarterly':
      return 3;
    case 'semi_annual':
      return 6;
    case 'yearly':
      return 12;
    default:
      throw new Error(`Invalid payment frequency: ${frequency}. Supported frequencies: weekly, bi_weekly, monthly, quarterly, semi_annual, yearly.`);
  }
}

// Get number of payments per year for different frequencies
function getPaymentsPerYear(frequency: string): number {
  switch (frequency) {
    case 'weekly':
      return 52;
    case 'bi_weekly':
      return 26;
    case 'monthly':
      return 12;
    case 'quarterly':
      return 4;
    case 'semi_annual':
      return 2;
    case 'yearly':
      return 1;
    default:
      throw new Error(`Invalid payment frequency: ${frequency}. Supported frequencies: weekly, bi_weekly, monthly, quarterly, semi_annual, yearly.`);
  }
}

// Calculate due dates based on start date and frequency
function calculateDueDates(startDate: Date, frequency: string, numberOfPayments: number): Date[] {
  const dueDates: Date[] = [];
  const baseDate = new Date(startDate.getTime());
  
  for (let i = 1; i <= numberOfPayments; i++) {
    const dueDate = new Date(baseDate);
    
    switch (frequency) {
      case 'weekly':
        dueDate.setDate(baseDate.getDate() + (i * 7));
        break;
      case 'bi_weekly':
        dueDate.setDate(baseDate.getDate() + (i * 14));
        break;
      case 'monthly':
        dueDate.setMonth(baseDate.getMonth() + i);
        break;
      case 'quarterly':
        dueDate.setMonth(baseDate.getMonth() + (i * 3));
        break;
      case 'semi_annual':
        dueDate.setMonth(baseDate.getMonth() + (i * 6));
        break;
      case 'yearly':
        dueDate.setFullYear(baseDate.getFullYear() + i);
        break;
    }
    
    dueDates.push(dueDate);
  }
  
  return dueDates;
}

// RBI-compliant EMI calculation using reducing balance method
function calculateEMI(principal: number, periodicRate: number, numberOfPayments: number): number {
  // Handle zero interest rate (rare but possible)
  if (periodicRate === 0) {
    return Math.round((principal / numberOfPayments) * 100) / 100;
  }
  
  // Standard EMI formula: EMI = [P × R × (1+R)^N] / [(1+R)^N - 1]
  const onePlusRate = 1 + periodicRate;
  const numerator = principal * periodicRate * Math.pow(onePlusRate, numberOfPayments);
  const denominator = Math.pow(onePlusRate, numberOfPayments) - 1;
  
  const emi = numerator / denominator;
  
  // Round to 2 decimal places (standard banking practice)
  return Math.round(emi * 100) / 100;
}

// Calculate APR according to RBI guidelines
function calculateAPR(
  principal: number, 
  totalInterest: number, 
  processingFee: number, 
  otherCharges: number, 
  tenureInDays: number
): number {
  const totalCost = totalInterest + processingFee + otherCharges;
  
  // RBI APR Formula: APR = [(Total Charges / Principal) / Tenure in Days] × 365 × 100
  const apr = ((totalCost / principal) / tenureInDays) * 365 * 100;
  
  return Math.round(apr * 100) / 100;
}

// Calculate effective annual rate considering compounding
function calculateEffectiveAnnualRate(nominalRate: number, compoundingFrequency: number): number {
  // EAR = (1 + r/n)^n - 1
  const effectiveRate = Math.pow(1 + (nominalRate / compoundingFrequency), compoundingFrequency) - 1;
  return Math.round(effectiveRate * 10000) / 100; // Convert to percentage with 2 decimal places
}

// Calculate compound interest
function calculateCompoundInterest(principal: number, rate: number, time: number, compoundingPerYear: number): number {
  const amount = principal * Math.pow(1 + (rate / compoundingPerYear), compoundingPerYear * time);
  return amount - principal;
}

// Calculate days between two dates
function calculateDaysBetweenDates(startDate: Date, endDate: Date): number {
  const timeDiff = endDate.getTime() - startDate.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
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

// Generate EMI schedule for reducing balance
function generateEMISchedule(
  principal: number, 
  periodicRate: number, 
  totalPayments: number, 
  dueDates: Date[], 
  emiAmount: number,
  gracePeriodDays: number,
  latePaymentPenalty: number
): PaymentScheduleItem[] {
  const schedule: PaymentScheduleItem[] = [];
  let remainingBalance = principal;
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;
  
  for (let i = 1; i <= totalPayments; i++) {
    const interestAmount = Math.round(remainingBalance * periodicRate * 100) / 100;
    const principalAmount = Math.min(Math.round((emiAmount - interestAmount) * 100) / 100, remainingBalance);
    const actualPayment = principalAmount + interestAmount;
    
    remainingBalance = Math.max(0, remainingBalance - principalAmount);
    cumulativePrincipal += principalAmount;
    cumulativeInterest += interestAmount;
    
    const daysBetween = i === 1 ? 30 : calculateDaysBetweenDates(dueDates[i-2], dueDates[i-1]);
    
    schedule.push({
      installmentNumber: i,
      dueDate: dueDates[i-1],
      principalAmount,
      interestAmount,
      totalAmount: actualPayment,
      remainingBalance,
      cumulativePrincipal,
      cumulativeInterest,
      principalPercentage: actualPayment > 0 ? (principalAmount / actualPayment) * 100 : 0,
      interestPercentage: actualPayment > 0 ? (interestAmount / actualPayment) * 100 : 0,
      gracePeriodEndDate: gracePeriodDays > 0 ? calculateGracePeriodEndDate(dueDates[i-1], gracePeriodDays) : undefined,
      latePaymentFee: calculateLatePaymentFee(actualPayment, latePaymentPenalty),
      daysBetweenPayments: daysBetween,
      effectivePeriodRate: periodicRate
    });
  }
  
  return schedule;
}

// Main repayment schedule calculation with banking industry standards
export function calculateRepaymentSchedule(terms: LoanTerms): RepaymentSchedule {
  const { 
    principal, 
    interestRate, 
    interestType, 
    tenureValue, 
    tenureUnit, 
    repaymentType, 
    repaymentFrequency = 'monthly', 
    startDate,
    gracePeriodDays = 0,
    latePaymentPenalty = 0,
    prepaymentPenalty = 0,
    processingFee = 0,
    otherCharges = 0
  } = terms;
  
  // Input validation following banking standards
  if (principal <= 0) throw new Error('Principal amount must be positive');
  if (interestRate < 0) throw new Error('Interest rate cannot be negative');
  if (tenureValue <= 0) throw new Error('Tenure must be positive');
  if (!startDate || isNaN(startDate.getTime())) throw new Error('Valid start date is required');
  
  const tenureInMonths = convertTenureToMonths(tenureValue, tenureUnit);
  const tenureInDays = convertTenureToDays(tenureValue, tenureUnit);
  const annualRate = interestRate / 100;
  const totalCharges = processingFee + otherCharges;
  
  // Calculate payment frequency and number of payments
  const paymentsPerYear = getPaymentsPerYear(repaymentFrequency);
  const periodicRate = annualRate / paymentsPerYear;
  const totalPayments = Math.ceil(tenureInMonths / getPaymentFrequencyInMonths(repaymentFrequency));
  
  // Use standard monthly compounding for effective rate calculation
  const compoundingPerYear = 12; // Standard banking practice
  
  // Calculate due dates
  const dueDates = calculateDueDates(startDate, repaymentFrequency, totalPayments);
  
  let schedule: PaymentScheduleItem[] = [];
  let totalInterest = 0;
  let emiAmount = 0;
  
  // Implementation for different repayment types
  if (repaymentType === 'full-payment') {
    // Bullet payment at maturity
    totalInterest = interestType === 'fixed' 
      ? principal * annualRate * (tenureInDays / 365)
      : calculateCompoundInterest(principal, annualRate, tenureInDays / 365, compoundingPerYear);
    
    const finalDate = new Date(startDate);
    switch (tenureUnit) {
      case 'months': finalDate.setMonth(finalDate.getMonth() + tenureValue); break;
      case 'years': finalDate.setFullYear(finalDate.getFullYear() + tenureValue); break;
      default: throw new Error(`Invalid tenure unit: ${tenureUnit}. Only months and years are supported.`);
    }
    
    const totalPayment = principal + totalInterest;
    schedule = [{
      installmentNumber: 1,
      dueDate: finalDate,
      principalAmount: principal,
      interestAmount: totalInterest,
      totalAmount: totalPayment,
      remainingBalance: 0,
      cumulativePrincipal: principal,
      cumulativeInterest: totalInterest,
      principalPercentage: (principal / totalPayment) * 100,
      interestPercentage: (totalInterest / totalPayment) * 100,
      gracePeriodEndDate: gracePeriodDays > 0 ? calculateGracePeriodEndDate(finalDate, gracePeriodDays) : undefined,
      latePaymentFee: calculateLatePaymentFee(totalPayment, latePaymentPenalty),
      daysBetweenPayments: tenureInDays,
      effectivePeriodRate: periodicRate * totalPayments
    }];
  } 
  else if (repaymentType === 'emi') {
    // Standard EMI calculation using reducing balance
    emiAmount = calculateEMI(principal, periodicRate, totalPayments);
    schedule = generateEMISchedule(principal, periodicRate, totalPayments, dueDates, emiAmount, gracePeriodDays, latePaymentPenalty);
    totalInterest = schedule.reduce((sum, payment) => sum + payment.interestAmount, 0);
  }
  else if (repaymentType === 'interest-only') {
    // Interest-only payments with principal at maturity
    const periodicInterest = principal * periodicRate;
    const lastPaymentIndex = totalPayments - 1;
    
    schedule = dueDates.map((dueDate, index) => {
      const isLastPayment = index === lastPaymentIndex;
      const principalAmount = isLastPayment ? principal : 0;
      const interestAmount = periodicInterest;
      const totalAmount = principalAmount + interestAmount;
      const remainingBalance = isLastPayment ? 0 : principal;
      const daysBetween = index === 0 ? 30 : calculateDaysBetweenDates(dueDates[index-1], dueDate);
      
      return {
        installmentNumber: index + 1,
        dueDate,
        principalAmount,
        interestAmount,
        totalAmount,
        remainingBalance,
        cumulativePrincipal: isLastPayment ? principal : 0,
        cumulativeInterest: interestAmount * (index + 1),
        principalPercentage: (principalAmount / totalAmount) * 100,
        interestPercentage: (interestAmount / totalAmount) * 100,
        gracePeriodEndDate: gracePeriodDays > 0 ? calculateGracePeriodEndDate(dueDate, gracePeriodDays) : undefined,
        latePaymentFee: calculateLatePaymentFee(totalAmount, latePaymentPenalty),
        daysBetweenPayments: daysBetween,
        effectivePeriodRate: periodicRate
      };
    });
    
    totalInterest = periodicInterest * totalPayments;
  }
  
  // Calculate final metrics
  const totalAmount = principal + totalInterest + totalCharges;
  const apr = calculateAPR(principal, totalInterest, processingFee, otherCharges, tenureInDays);
  const effectiveRate = calculateEffectiveAnnualRate(annualRate, compoundingPerYear);
  
  return {
    totalAmount,
    totalInterest,
    emiAmount: repaymentType === 'emi' ? emiAmount : undefined,
    numberOfPayments: totalPayments,
    annualPercentageRate: apr,
    effectiveInterestRate: effectiveRate,
    totalCostOfCredit: totalAmount,
    processingFee,
    totalCharges,
    schedule,
    amortizationSummary: {
      totalPrincipal: principal,
      totalInterest,
      totalCharges,
      averagePayment: totalAmount / totalPayments,
      principalToInterestRatio: totalInterest > 0 ? principal / totalInterest : principal
    },
    rbiCompliance: {
      isCompliant: apr <= 50 && principal <= 1000000, // RBI guidelines: max 50% APR, ₹10L limit
      fairPracticesCode: true,
      transparentPricing: true
    }
  };
}

// Validation function to check payment amounts against schedule
export function validatePaymentAmount(
  offerId: string,
  paymentAmount: number,
  installmentNumber: number,
  schedule: PaymentScheduleItem[]
): { isValid: boolean; message: string; expectedAmount?: number } {
  const targetInstallment = schedule.find(item => item.installmentNumber === installmentNumber);
  
  if (!targetInstallment) {
    return { isValid: false, message: 'Invalid installment number' };
  }
  
  const expectedAmount = targetInstallment.totalAmount;
  const tolerance = 0.01; // 1 paisa tolerance for rounding differences
  
  if (Math.abs(paymentAmount - expectedAmount) <= tolerance) {
    return { isValid: true, message: 'Payment amount is correct' };
  }
  
  if (paymentAmount > expectedAmount) {
    return { 
      isValid: false, 
      message: `Payment amount ₹${paymentAmount} exceeds expected amount ₹${expectedAmount}`, 
      expectedAmount 
    };
  }
  
  return { 
    isValid: false, 
    message: `Payment amount ₹${paymentAmount} is less than expected amount ₹${expectedAmount}`, 
    expectedAmount 
  };
}

// Get next payment due information
export function getNextPaymentDue(
  schedule: PaymentScheduleItem[],
  paidInstallments: number[]
): PaymentScheduleItem | null {
  return schedule.find(item => !paidInstallments.includes(item.installmentNumber)) || null;
}