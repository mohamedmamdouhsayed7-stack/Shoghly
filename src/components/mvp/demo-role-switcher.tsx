"use client";

import { useState } from "react";
import { ArrowLeftRight, BadgeCheck, LoaderCircle } from "lucide-react";
import { DEMO_ACCOUNTS, type DemoAccountKey } from "@/lib/mvp/demo-mode-policy";
import { Button } from "@/components/ui/button";

export function DemoRoleSwitcher({ account }: { account: DemoAccountKey }) {
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const options: DemoAccountKey[] =
    account === "worker"
      ? ["task-admin"]
      : account === "task-admin"
        ? ["worker", "review-admin"]
        : ["worker", "task-admin"];

  async function switchAccount(nextAccount: DemoAccountKey) {
    setSwitching(true);
    setError("");
    try {
      const response = await fetch("/api/demo/role", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ account: nextAccount }),
      });
      if (!response.ok) throw new Error("تعذّر تبديل حساب العرض.");
      window.location.assign(DEMO_ACCOUNTS[nextAccount].path);
    } catch (switchError) {
      setError(
        switchError instanceof Error
          ? switchError.message
          : "تعذّر تبديل حساب العرض.",
      );
      setSwitching(false);
    }
  }

  return (
    <section
      aria-label="حسابات العرض التجريبي"
      className="mb-5 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600">
          <BadgeCheck aria-hidden="true" className="size-5" />
        </span>
        <div>
          <p className="text-xs font-extrabold tracking-wide text-rose-700">
            DEMO MODE ·{" "}
            {DEMO_ACCOUNTS[account].role === "worker"
              ? "حساب العامل"
              : "حساب إداري تجريبي"}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {DEMO_ACCOUNTS[account].label}
            <span
              className="ms-2 text-xs font-medium text-slate-500"
              dir="ltr"
            ></span>
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:items-end">
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <Button
              key={option}
              type="button"
              variant="secondary"
              disabled={switching}
              onClick={() => switchAccount(option)}
              className="border-rose-200 text-rose-800 hover:bg-rose-50"
            >
              {switching ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : (
                <ArrowLeftRight aria-hidden="true" className="size-4" />
              )}
              التبديل إلى {DEMO_ACCOUNTS[option].label}
            </Button>
          ))}
        </div>
        {error ? (
          <p role="alert" className="text-xs text-rose-700">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
