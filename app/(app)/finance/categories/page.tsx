import { prisma } from "@/lib/db";
import { AddCategoryDialog } from "@/components/finance/add-category-dialog";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { archived: false },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <AddCategoryDialog />
      </div>

      {categories.length === 0 ? (
        <p className="text-muted-foreground">
          No categories yet. Add one to start tagging transactions.
        </p>
      ) : (
        <ul className="space-y-2">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <span className="flex items-center gap-2 font-medium">
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                {category.name}
              </span>
              <span className="text-muted-foreground">
                {category.kind === "INCOME" ? "Income" : "Expense"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
