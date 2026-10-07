"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  commitImport,
  previewImport,
  type PreviewRow,
} from "@/app/(app)/finance/import/actions";

const SKIP = "__skip";

export function ImportWizard({ accounts }: { accounts: { id: string; name: string }[] }) {
  const [csvText, setCsvText] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [accountMap, setAccountMap] = useState<Record<string, string>>({});
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setImportedCount(null);
    startTransition(async () => {
      const text = await file.text();
      const result = await previewImport(text);
      if (!result.ok) {
        setError(result.error);
        setCsvText(null);
        return;
      }
      setCsvText(text);
      setRows(result.rows);
      setExcluded(new Set());
      setAccountMap(
        Object.fromEntries(result.bankAccounts.map((b) => [b.name, b.accountId ?? SKIP]))
      );
    });
  }

  function handleConfirm() {
    if (!csvText) return;
    startTransition(async () => {
      const { imported } = await commitImport({
        csvText,
        accountMap: Object.fromEntries(
          Object.entries(accountMap).map(([bank, id]) => [bank, id === SKIP ? "" : id])
        ),
        excludedIds: [...excluded],
      });
      setImportedCount(imported);
      setCsvText(null);
      setRows([]);
    });
  }

  function toggleRow(importId: string, include: boolean) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (include) next.delete(importId);
      else next.add(importId);
      return next;
    });
  }

  const isMapped = (row: PreviewRow) => accountMap[row.bankAccount] !== SKIP;
  const willImport = rows.filter(
    (r) => r.status === "new" && isMapped(r) && !excluded.has(r.importId)
  );
  const counts = {
    new: rows.filter((r) => r.status === "new").length,
    duplicate: rows.filter((r) => r.status === "duplicate").length,
    skipped: rows.filter((r) => r.status === "skipped").length,
    transfers: rows.filter((r) => r.status === "new" && r.isTransfer).length,
  };
  const visibleRows = showAll ? rows : rows.filter((r) => r.status === "new");
  const accountItems = [
    { value: SKIP, label: "Don't import" },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="csv">CSV file</Label>
        <Input
          id="csv"
          type="file"
          accept=".csv,text/csv"
          disabled={isPending}
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {isPending && <p className="text-sm text-muted-foreground">Working…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {importedCount !== null && (
          <p className="text-sm text-green-600">
            Imported {importedCount} transaction{importedCount === 1 ? "" : "s"}.{" "}
            <Link href="/finance" className="underline">
              Back to Finance
            </Link>
          </p>
        )}
      </div>

      {csvText && (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">1. Match accounts</h2>
            {Object.keys(accountMap).map((bankName) => (
              <div key={bankName} className="grid gap-1 sm:grid-cols-2 sm:items-center sm:gap-3">
                <span className="text-sm break-words">{bankName}</span>
                <Select
                  value={accountMap[bankName]}
                  onValueChange={(value) =>
                    setAccountMap((prev) => ({ ...prev, [bankName]: value ?? SKIP }))
                  }
                  items={accountItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accountItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">2. Review</h2>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={showAll} onCheckedChange={(c) => setShowAll(c === true)} />
                Show duplicates and skipped rows
              </label>
            </div>
            <p className="text-sm text-muted-foreground">
              {counts.new} new ({counts.transfers} transfers between your accounts) ·{" "}
              {counts.duplicate} already imported · {counts.skipped} skipped (pending)
            </p>

            {visibleRows.length === 0 ? (
              <p className="text-muted-foreground">Nothing new in this file.</p>
            ) : (
              <ul className="space-y-1">
                {visibleRows.map((row) => {
                  const selectable = row.status === "new" && isMapped(row);
                  return (
                    <li
                      key={row.importId}
                      className={cn(
                        "flex items-center gap-3 rounded-md border p-2 text-sm",
                        !selectable && "opacity-50"
                      )}
                    >
                      <Checkbox
                        disabled={!selectable}
                        checked={selectable && !excluded.has(row.importId)}
                        onCheckedChange={(c) => toggleRow(row.importId, c === true)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{row.description}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.date} · {row.isTransfer ? "Transfer" : row.category}
                          {row.status === "duplicate" && " · already imported"}
                          {row.skipReason && ` · ${row.skipReason}`}
                          {row.status === "new" && !isMapped(row) && " · account not imported"}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 font-medium",
                          row.isTransfer
                            ? "text-muted-foreground"
                            : row.kind === "INCOME"
                              ? "text-green-600"
                              : "text-red-600"
                        )}
                      >
                        {row.kind === "INCOME" ? "+" : "-"}${row.amount.toFixed(2)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <Button
            className="w-full sm:w-auto"
            disabled={isPending || willImport.length === 0}
            onClick={handleConfirm}
          >
            Import {willImport.length} transaction{willImport.length === 1 ? "" : "s"}
          </Button>
        </>
      )}
    </div>
  );
}
