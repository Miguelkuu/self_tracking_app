import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPlanData } from "@/lib/plan";
import { PlanView } from "@/components/finance/plan-view";

export default async function PlanPage() {
  const data = await getPlanData();

  return (
    <div className="space-y-6">
      <Link
        href="/accounts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Accounts
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Payoff &amp; savings plan</h1>
        <p className="text-sm text-muted-foreground">
          Where to trim spending, how much to pay on your cards, and how much to save.
        </p>
      </div>
      <PlanView data={data} />
    </div>
  );
}
