import { CategoryKind } from "../lib/generated/prisma/enums";
import { prisma } from "../lib/db";


async function main() {
  const categories = [
    { name: "Salary", kind: CategoryKind.INCOME, color: "#22c55e" },
    { name: "Groceries", kind: CategoryKind.EXPENSE, color: "#f97316" },
    { name: "Rent", kind: CategoryKind.EXPENSE, color: "#ef4444" },
    { name: "Utilities", kind: CategoryKind.EXPENSE, color: "#3b82f6" },
    { name: "Dining Out", kind: CategoryKind.EXPENSE, color: "#eab308" },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name_kind: { name: category.name, kind: category.kind } },
      update: {},
      create: category,
    });
  }

  console.log(`Seeded ${categories.length} categories.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
