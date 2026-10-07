"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";
import { archiveBill } from "@/app/(app)/bills/actions";

export function DeleteBillButton({ billId, billName }: { billId: string; billName: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(`Remove "${billName}"? This stops tracking it and its upcoming payments.`)) {
      return;
    }
    startTransition(async () => {
      await archiveBill(billId);
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Remove ${billName}`}
      disabled={isPending}
      onClick={handleClick}
    >
      <Trash2Icon />
    </Button>
  );
}
