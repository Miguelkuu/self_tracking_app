// Installment loan math (Affirm, Klarna, car loans). Pure functions, shared
// by the server pages and the planner in the browser.

export type Loan = {
  amount: number; // owed right before the first payment below
  monthlyPayment: number;
  apr: number; // percent; 0 for most Affirm/Klarna plans
  firstPayment: Date; // the "next payment date" entered in settings (UTC)
};

export type LoanStatus = {
  remaining: number; // owed today
  paymentsLeft: number | null; // null = payment doesn't cover the interest
  nextPayment: Date | null;
  lastPayment: Date | null; // the payment that clears it
};

const MAX_PAYMENTS = 600;

// Same day of month, clamped (Jan 31 + 1 month = Feb 28/29).
export function addMonths(date: Date, months: number) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(date.getUTCDate(), lastDay)));
}

export function loanStatus(loan: Loan, today = new Date()): LoanStatus {
  const rate = loan.apr / 100 / 12;
  let balance = loan.amount;
  let remainingToday = loan.amount;
  let paymentsLeft = 0;
  let nextPayment: Date | null = null;

  for (let i = 0; i < MAX_PAYMENTS && balance > 0.005; i++) {
    const date = addMonths(loan.firstPayment, i);
    const interest = balance * rate;
    if (loan.monthlyPayment <= interest) {
      return { remaining: remainingToday, paymentsLeft: null, nextPayment, lastPayment: null };
    }
    balance = Math.max(0, balance + interest - loan.monthlyPayment);

    if (date <= today) {
      remainingToday = balance; // this payment already happened
    } else {
      nextPayment ??= date;
      paymentsLeft++;
    }
    if (balance <= 0.005) {
      return {
        remaining: remainingToday,
        paymentsLeft,
        nextPayment,
        lastPayment: date,
      };
    }
  }
  return { remaining: remainingToday, paymentsLeft: null, nextPayment, lastPayment: null };
}

// Whole months from now until a date, for lining loans up with the card
// payoff simulation (month 1 = the next payment).
export function monthsUntil(date: Date, today = new Date()) {
  return Math.max(
    0,
    (date.getUTCFullYear() - today.getUTCFullYear()) * 12 + date.getUTCMonth() - today.getUTCMonth()
  );
}
