import { createHash } from "node:crypto";
import Papa from "papaparse";

// Parser for Bank of America's combined "ExportData.csv" (Spending & Budgeting
// export). One file covers every BofA account, with these columns:
// Status, Date, Original Description, Split Type, Category, Currency, Amount,
// User Description, Memo, Classification, Account Name, Simple Description
// Amounts are signed the same way for every account: negative = money out.

export type ParsedRow = {
  importId: string;
  date: Date;
  description: string;
  originalDescription: string;
  amount: number; // always positive; direction lives in `kind`
  kind: "INCOME" | "EXPENSE";
  bankAccount: string;
  bankCategory: string;
  category: string | null; // suggested app category name; null for transfers
  isTransfer: boolean;
  skipReason: string | null;
};

const REQUIRED_COLUMNS = [
  "Status",
  "Date",
  "Original Description",
  "Category",
  "Amount",
  "Account Name",
  "Simple Description",
];

// Money moving between your own checking, savings and credit card. Each one
// shows up twice (out of one account, into another). They're imported as
// transfers so balances stay right without counting as income or spending.
// Zelle and payments to other lenders are NOT listed here: that money leaves.
const INTERNAL_TRANSFER_PATTERNS = [
  /^Online Banking transfer (to|from) (CHK|SAV)\b/i,
  /^Mobile Banking payment to CRD\b/i,
  /^PAYMENT FROM (SAV|CHK)\b/i,
];

// Checked before BofA's own category, first match wins. BofA gets some of
// these wrong (vending machines as Groceries, subscriptions as Dining).
const KEYWORD_CATEGORIES: [RegExp, string][] = [
  [/VENDING/i, "Snacks"],
  [
    /NETFLIX|SPOTIFY|HULU|HBOMAX|DISNEY ?PLUS|YOUTUBE|PLAYSTATION|XBOX|STEAM GAMES|APPLE\.COM\/BILL|ANTHROPIC|OPENAI/i,
    "Subscriptions",
  ],
  [/FITNESS|\bGYM\b/i, "Gym"],
  [/\bTOLL/i, "Tolls"],
  [/^Zelle payment to/i, "Zelle sent"],
  [/^Zelle payment from/i, "Zelle received"],
];

// Renames for BofA categories that read better under a different name here.
const BANK_CATEGORY_RENAMES: Record<string, string> = {
  "Credit Card Payments": "Debt payments",
  Loans: "Debt payments",
  "Service Charges/Fees": "Fees & interest",
  "Paychecks/Salary": "Salary",
};

function suggestCategory(originalDescription: string, bankCategory: string) {
  for (const [pattern, name] of KEYWORD_CATEGORIES) {
    if (pattern.test(originalDescription)) return name;
  }
  return BANK_CATEGORY_RENAMES[bankCategory] ?? bankCategory;
}

function getSkipReason(status: string, amount: number) {
  if (status.toLowerCase() !== "posted") return "Not posted yet";
  if (amount === 0) return "Zero amount";
  return null;
}

// "09/28/2026" -> UTC midnight, matching how manually-entered dates are stored.
function parseDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) throw new Error(`Unrecognized date "${value}"`);
  const [, month, day, year] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

export function parseBofaCsv(text: string): ParsedRow[] {
  const result = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  });

  const columns = result.meta.fields ?? [];
  const missing = REQUIRED_COLUMNS.filter((c) => !columns.includes(c));
  if (missing.length > 0) {
    throw new Error(
      `This doesn't look like a Bank of America export. Missing columns: ${missing.join(", ")}`
    );
  }

  // Identical-looking rows can be genuinely separate purchases (two $3.10
  // vending charges on one day), so the fingerprint includes how many times
  // that exact row has appeared so far in the file.
  const seen = new Map<string, number>();

  return result.data.map((raw, index) => {
    const originalDescription = raw["Original Description"].replace(/\s+/g, " ");
    const signedAmount = Number(raw["Amount"].replace(/,/g, ""));
    if (!Number.isFinite(signedAmount)) {
      throw new Error(`Row ${index + 2}: unrecognized amount "${raw["Amount"]}"`);
    }

    const date = parseDate(raw["Date"]);
    const bankAccount = raw["Account Name"];
    const bankCategory = raw["Category"];

    const isTransfer = INTERNAL_TRANSFER_PATTERNS.some((p) => p.test(originalDescription));

    const key = [raw["Date"], bankAccount, signedAmount.toFixed(2), originalDescription].join("|");
    const occurrence = (seen.get(key) ?? 0) + 1;
    seen.set(key, occurrence);

    return {
      importId: createHash("sha256").update(`${key}|${occurrence}`).digest("hex"),
      date,
      description: raw["Simple Description"] || originalDescription,
      originalDescription,
      amount: Math.abs(signedAmount),
      kind: signedAmount < 0 ? "EXPENSE" : "INCOME",
      bankAccount,
      bankCategory,
      category: isTransfer ? null : suggestCategory(originalDescription, bankCategory),
      isTransfer,
      skipReason: getSkipReason(raw["Status"], signedAmount),
    };
  });
}
