import { prisma } from "@/lib/db";
import { ensureUpcomingBillPayments } from "@/lib/bills";
import { AddBillDialog } from "@/components/bills/add-bill-dialog";
import { PaidCheckbox } from "@/components/bills/paid-checkbox";

export default async function BillsPage() {
  await ensureUpcomingBillPayments();

  const [payments, accounts] = await Promise.all([
    prisma.billPayment.findMany({
      include: { bill: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.account.findMany({
      where: { archived: false },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bills</h1>
        <AddBillDialog accounts={accounts} />
      </div>

      {payments.length === 0 ? (
        <p className="text-muted-foreground">
          No bills yet. Add one to start tracking due dates.
        </p>
      ) : (
        <ul className="space-y-2">
          {payments.map((payment) => {
            const overdue = !payment.paid && payment.dueDate < new Date();
            return (
              <li
                key={payment.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  <PaidCheckbox paymentId={payment.id} initialPaid={payment.paid} />
                  <div>
                    <p
                      className={
                        payment.paid
                          ? "font-medium text-muted-foreground line-through"
                          : "font-medium"
                      }
                    >
                      {payment.bill.name}
                    </p>
                    <p
                      className={
                        overdue ? "text-xs text-red-600" : "text-xs text-muted-foreground"
                      }
                    >
                      {payment.bill.category ? `${payment.bill.category} · ` : ""}
                      Due {payment.dueDate.toLocaleDateString()}
                      {overdue ? " (overdue)" : ""}
                    </p>
                  </div>
                </div>
                <span className="font-medium">${Number(payment.amount).toFixed(2)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
