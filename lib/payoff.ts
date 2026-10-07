// Credit card payoff simulation. Pure functions, so the planner page can
// re-run them instantly in the browser as sliders move.

export type Card = {
  id: string;
  name: string;
  owed: number;
  apr: number; // percent, e.g. 26.74
  minFloor: number; // the card's fixed minimum, e.g. $35
};

export type PayoffResult = {
  months: number | null; // null = never paid off at this rate
  totalInterest: number;
  paidOffMonth: Record<string, number>; // card id -> month it hits $0
};

// Most issuers (BofA included) charge the greater of a fixed floor or
// 1% of the balance plus that month's interest.
export function minimumPayment(balance: number, interest: number, floor: number) {
  return Math.min(balance + interest, Math.max(floor, balance * 0.01 + interest));
}

const MAX_MONTHS = 600;

// Avalanche method: every card gets its minimum, then any extra money goes to
// the highest-APR card first. When a card is paid off, its payment rolls into
// the next one. This is the order that costs the least interest.
export function simulatePayoff(
  cards: Card[],
  { monthlyBudget, lumpSum = 0, minimumsOnly = false, raises = [] }: {
    monthlyBudget: number;
    lumpSum?: number;
    minimumsOnly?: boolean;
    // Money that frees up later, e.g. a loan's payment once it's paid off.
    raises?: { afterMonth: number; amount: number }[];
  }
): PayoffResult {
  const order = [...cards].sort((a, b) => b.apr - a.apr);
  const balances = new Map(order.map((c) => [c.id, c.owed]));
  const paidOffMonth: Record<string, number> = {};
  let totalInterest = 0;

  // A lump sum today also goes highest-APR first.
  let lump = lumpSum;
  for (const card of order) {
    const pay = Math.min(lump, balances.get(card.id)!);
    balances.set(card.id, balances.get(card.id)! - pay);
    lump -= pay;
    if (balances.get(card.id)! <= 0.005) paidOffMonth[card.id] = 0;
  }

  for (let month = 1; month <= MAX_MONTHS; month++) {
    const open = order.filter((c) => balances.get(c.id)! > 0.005);
    if (open.length === 0) return { months: month - 1, totalInterest, paidOffMonth };

    const interest = new Map(
      open.map((c) => [c.id, (balances.get(c.id)! * c.apr) / 100 / 12])
    );
    const mins = new Map(
      open.map((c) => [c.id, minimumPayment(balances.get(c.id)!, interest.get(c.id)!, c.minFloor)])
    );
    const minTotal = [...mins.values()].reduce((a, b) => a + b, 0);

    const budget =
      monthlyBudget + raises.filter((r) => month > r.afterMonth).reduce((s, r) => s + r.amount, 0);
    let extra = minimumsOnly ? 0 : Math.max(0, budget - minTotal);
    for (const card of open) {
      const owedNow = balances.get(card.id)! + interest.get(card.id)!;
      let pay = mins.get(card.id)!;
      const topUp = Math.min(extra, owedNow - pay);
      pay += topUp;
      extra -= topUp;

      totalInterest += interest.get(card.id)!;
      balances.set(card.id, owedNow - pay);
      if (balances.get(card.id)! <= 0.005) paidOffMonth[card.id] = month;
    }

    // Payments that never outpace interest mean the debt never shrinks.
    if (month === 1 && open.every((c) => balances.get(c.id)! >= c.owed - 0.005) && lumpSum === 0) {
      return { months: null, totalInterest, paidOffMonth };
    }
  }
  return { months: null, totalInterest, paidOffMonth };
}

export function monthsFromNow(months: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
