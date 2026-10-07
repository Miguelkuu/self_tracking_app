"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PastPaymentsToggle({ hidePaid }: { hidePaid: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    if (hidePaid) {
      params.set("hidePaid", "0");
    } else {
      params.delete("hidePaid");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <Button variant="link" size="sm" className="h-auto p-0" onClick={toggle}>
      {hidePaid ? "Show past payments" : "Hide past payments"}
    </Button>
  );
}
