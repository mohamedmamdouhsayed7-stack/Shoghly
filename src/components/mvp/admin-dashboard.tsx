"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  ExternalLink,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useMvp } from "@/components/mvp/mvp-provider";
import { formatIqd } from "@/lib/mvp/model";

const unavailable = "غير متاح";

export function AdminDashboard() {
  const { state, ready, demoMode, canReviewTasks } = useMvp();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const approvedToday = state.submissions.filter(
    (item) =>
      item.status === "approved" &&
      item.reviewedAt &&
      Date.parse(item.reviewedAt) >= todayStart.getTime(),
  );
  const totalRewards = state.submissions
    .filter((item) => item.status === "approved")
    .reduce((sum, item) => sum + (item.rewardIqd ?? 0), 0);
  const activeTasks = state.tasks.filter((task) => task.active).length;

  const cards = useMemo(
    () => [
      {
        label: "إجمالي المستخدمين",
        value: unavailable,
        icon: Users,
        detail: "لا تتوفر إحصاءات مستخدمين مجمّعة",
      },
      {
        label: "المستخدمون النشطون",
        value: unavailable,
        icon: CheckCircle2,
        detail: "مصدر بيانات موثوق غير مهيأ",
      },
      {
        label: "مستخدمون جدد · آخر 24 ساعة",
        value: unavailable,
        icon: Users,
        detail: "لا تُعرض أرقام غير متحققة",
      },
      {
        label: demoMode ? "المهام النشطة · DEMO" : "المهام النشطة",
        value: ready ? String(activeTasks) : "…",
        icon: ClipboardCheck,
        detail: "من بيانات النموذج في هذا المتصفح",
      },
      {
        label: demoMode ? "المهام المكتملة · DEMO" : "المهام المكتملة اليوم",
        value: ready ? String(approvedToday.length) : "…",
        icon: BarChart3,
        detail: "عدد الموافقات في بيانات النموذج اليوم",
      },
      {
        label: demoMode
          ? "المكافآت المسجلة · DEMO"
          : "إجمالي المكافآت المصروفة",
        value: ready ? formatIqd(totalRewards) : "…",
        icon: Coins,
        detail: "قيمة مسجلة تجريبياً وليست مبلغاً مدفوعاً",
      },
    ],
    [activeTasks, approvedToday.length, demoMode, ready, totalRewards],
  );

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-rose-600">الإدارة</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
            لوحة التحكم
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {demoMode
              ? "لوحة DEMO — الأرقام خاصة بالبيانات التجريبية في هذا المتصفح."
              : "ملخص مبني على البيانات المحلية المتاحة؛ الأرقام غير المتوفرة تظهر بوضوح."}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-white focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
        >
          مساحة العامل <ArrowLeft aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {cards.map(({ label, value, icon: Icon, detail }) => (
          <Card key={label}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs leading-5 font-semibold text-slate-500 sm:text-sm">
                  {label}
                </p>
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
                  <Icon aria-hidden="true" className="size-[18px]" />
                </span>
              </div>
              <p className="mt-4 text-xl font-extrabold sm:text-2xl" dir="auto">
                {value}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href="/admin/tasks"
          className="flex min-h-20 items-center justify-between rounded-2xl bg-rose-500 p-5 text-white shadow-sm hover:bg-rose-600 focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <span>
            <span className="block font-bold">إدارة المهام</span>
            <span className="mt-1 block text-sm text-white/80">
              إنشاء المهام وتحديثها وتفعيلها
            </span>
          </span>
          <ExternalLink aria-hidden="true" className="size-5" />
        </Link>
        {!demoMode || canReviewTasks ? (
          <Link
            href="/admin/review"
            className="flex min-h-20 items-center justify-between rounded-2xl bg-slate-900 p-5 text-white shadow-sm hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <span>
              <span className="block font-bold">مراجعة المشاركات</span>
              <span className="mt-1 block text-sm text-white/70">
                الاطلاع على الإثباتات التجريبية
              </span>
            </span>
            <ClipboardCheck aria-hidden="true" className="size-5" />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
