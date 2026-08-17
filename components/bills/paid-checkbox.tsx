"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleBillPaymentPaid } from "@/app/(app)/bills/actions";

export function PaidCheckbox({
  paymentId,
  initialPaid,
}: {
  paymentId: string;
  initialPaid: boolean;
}) {
  const [paid, setPaid] = useState(initialPaid);
  const [isPending, startTransition] = useTransition();

  function handleChange(checked: boolean) {
    setPaid(checked);
    startTransition(async () => {
      await toggleBillPaymentPaid(paymentId, checked);
    });
  }

  return (
    <Checkbox checked={paid} onCheckedChange={handleChange} disabled={isPending} />
  );
}
