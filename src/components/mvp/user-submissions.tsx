"use client";

import Link from "next/link";
import { ArrowLeft, Clock3, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useMvp } from "@/components/mvp/mvp-provider";
import { formatIqd } from "@/lib/mvp/model";

const statusInfo = {
  pending: { label: "قيد المراجعة", classes: "bg-amber-50 text-amber-800" },
  approved: { label: "مقبولة", classes: "bg-emerald-50 text-emerald-800" },
  rejected: { label: "مرفوضة", classes: "bg-rose-50 text-rose-800" },
};

export function MySubmissions() {
  const { state, userId, ready, demoMode } = useMvp();
  const submissions = state.submissions
    .filter((item) => item.userId === userId)
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt));

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-6">
        <p className="text-sm font-semibold text-emerald-700">سجل الإنجاز</p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">مشاركاتي</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          تابع حالة الإثباتات وسبب الرفض إن وجد.
        </p>
      </div>
      {!ready ? (
        <p className="rounded-2xl bg-white p-5 text-sm text-slate-500">
          جارٍ تحميل المشاركات…
        </p>
      ) : null}
      {ready && submissions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center px-5 py-10 text-center">
            <FileText aria-hidden="true" className="size-8 text-slate-400" />
            <h2 className="mt-3 font-bold">لا توجد مشاركات بعد</h2>
            <Link
              href="/tasks"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-semibold text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
            >
              تصفح المهام <ArrowLeft aria-hidden="true" className="size-4" />
            </Link>
          </CardContent>
        </Card>
      ) : null}
      <ul className="grid gap-3">
        {submissions.map((submission) => {
          const task = state.tasks.find(
            (item) => item.id === submission.taskId,
          );
          const status = statusInfo[submission.status];
          return (
            <li key={submission.id}>
              <Card>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-bold">
                        {task?.title ?? "مهمة"}
                      </h2>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock3 aria-hidden="true" className="size-3.5" />
                        <time dateTime={submission.submittedAt}>
                          {new Date(submission.submittedAt).toLocaleString(
                            "ar-IQ",
                          )}
                        </time>
                      </p>
                    </div>
                    {demoMode ? (
                      <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-extrabold text-rose-700">
                        DEMO
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${status.classes}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  {submission.status === "approved" ? (
                    <p className="mt-4 text-sm font-bold text-emerald-700">
                      المكافأة المسجلة تجريبياً:{" "}
                      {formatIqd(submission.rewardIqd ?? 0)}
                    </p>
                  ) : null}
                  {submission.status === "rejected" ? (
                    <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-900">
                      <strong>سبب الرفض:</strong>{" "}
                      {submission.rejectionReason || "لم يرفق المراجع سبباً."}
                      <p className="mt-1 text-xs">
                        لا توجد سياسة إعادة محاولة مهيأة حالياً.
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
