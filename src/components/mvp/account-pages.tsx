"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CircleUserRound,
  Clock3,
  Package,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMvp } from "@/components/mvp/mvp-provider";
import { formatIqd } from "@/lib/mvp/model";

export function BalancePage() {
  const { state, userId, demoMode } = useMvp();
  const approved = state.submissions
    .filter((item) => item.userId === userId && item.status === "approved")
    .sort(
      (a, b) => Date.parse(b.reviewedAt ?? "") - Date.parse(a.reviewedAt ?? ""),
    );
  const balance = approved.reduce(
    (sum, item) => sum + (item.rewardIqd ?? 0),
    0,
  );

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-6">
        <p className="text-sm font-semibold text-emerald-700">ملخص الحساب</p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
          الرصيد والأرباح
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          يعرض هذا النموذج مكافآت المشاركات المعتمدة محلياً فقط.
        </p>
      </div>
      <Card className="overflow-hidden">
        <div className="bg-slate-900 p-5 text-white sm:p-7">
          <p className="text-sm text-white/70">
            {demoMode ? "الرصيد · DEMO" : "الرصيد التوضيحي"}
          </p>
          <p className="mt-2 text-3xl font-extrabold" dir="auto">
            {formatIqd(balance)}
          </p>
          <p className="mt-3 text-sm leading-6 text-white/70">
            قيمة محلية تجريبية، لا يمكن سحبها أو استخدامها كرصيد مالي.
          </p>
        </div>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          <Button asChild variant="secondary">
            <Link href="/withdrawal">
              سحب الرصيد <ArrowLeft aria-hidden="true" className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/deposit">
              إيداع <ArrowLeft aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
      <div className="mt-7">
        <h2 className="text-lg font-bold">سجل المكافآت المعتمدة</h2>
        {approved.length === 0 ? (
          <Card className="mt-3">
            <CardContent className="p-6 text-center text-sm text-slate-500">
              لا توجد مكافآت مسجلة لهذا الحساب.
            </CardContent>
          </Card>
        ) : (
          <ul className="mt-3 grid gap-3">
            {approved.map((item) => {
              const task = state.tasks.find(
                (candidate) => candidate.id === item.taskId,
              );
              return (
                <li key={item.id}>
                  <Card>
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {task?.title ?? "مهمة"}
                        </p>
                        {demoMode ? (
                          <span className="mt-1 inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">
                            DEMO REWARD
                          </span>
                        ) : null}
                        <time
                          className="mt-1 block text-xs text-slate-500"
                          dateTime={item.reviewedAt ?? undefined}
                        >
                          {item.reviewedAt
                            ? new Date(item.reviewedAt).toLocaleString("ar-IQ")
                            : ""}
                        </time>
                      </div>
                      <span className="shrink-0 font-bold text-emerald-700">
                        {formatIqd(item.rewardIqd ?? 0)}
                      </span>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

export function PackagesPage() {
  const { demoMode } = useMvp();
  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="text-sm font-semibold text-emerald-700">
          الاشتراك الشخصي
        </p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">الباقات</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          تُحسب مكافأة المهمة وفق باقة العامل نفسه متى توفرت بيانات اشتراك
          موثقة.
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center px-5 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-600">
            <Package aria-hidden="true" className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-bold">
            لا توجد باقة مهيأة لهذا الحساب
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            لا توجد حالياً أسماء أو أسعار أو مدد أو مضاعفات باقات معتمدة للعرض.
            لذلك يُستخدم المضاعف 1× دون افتراض مزايا إضافية.
          </p>
          <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
            {demoMode
              ? "مكافأة DEMO الأساسية: "
              : "المكافأة الأساسية الحالية: "}
            {formatIqd(250)}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

export function UnavailableMoneyAction({
  kind,
}: {
  kind: "deposit" | "withdrawal";
}) {
  const isDeposit = kind === "deposit";
  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="text-sm font-semibold text-slate-500">الحركات المالية</p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
          {isDeposit ? "الإيداع" : "سحب الرصيد"}
        </h1>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center px-5 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-700">
            <ShieldAlert aria-hidden="true" className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-bold">
            {isDeposit ? "الإيداع غير متاح" : "السحب غير متاح"}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            لا توجد حالياً خدمة مالية موثوقة أو سجل مالي معتمد. لم يتم إنشاء طلب
            أو محاكاة معاملة.
          </p>
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            الرصيد الظاهر في النموذج الأولي توضيحي ومحلي فقط، ولا يمثل أموالاً
            قابلة للتحويل.
          </p>
          <Button asChild variant="secondary" className="mt-5">
            <Link href="/account/balance">
              <Wallet aria-hidden="true" className="size-4" /> العودة إلى الرصيد
            </Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

export function AccountOverview() {
  const { userId, state, canManageTasks, demoMode } = useMvp();
  const approvals = state.submissions.filter(
    (item) => item.userId === userId && item.status === "approved",
  ).length;
  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="text-sm font-semibold text-emerald-700">ملف العامل</p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">الحساب</h1>
        <p className="mt-2 text-sm text-slate-500">
          إعدادات الدخول والهوية تدار من حسابك الآمن.
        </p>
      </div>
      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-600">
            <CircleUserRound aria-hidden="true" className="size-6" />
          </span>
          <div>
            <p className="font-bold">
              {demoMode
                ? canManageTasks
                  ? "مدير تجريبي · DEMO ADMIN"
                  : userId === "demo-review-admin"
                    ? "مراجع تجريبي · DEMO REVIEWER"
                    : "عامل تجريبي · DEMO WORKER"
                : "حساب شغلني"}
            </p>
            {!demoMode ? (
              <p className="mt-1 text-xs text-slate-500" dir="ltr">
                {userId}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">المشاركات المعتمدة</p>
            <p className="mt-2 text-2xl font-extrabold">{approvals}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">حالة البيانات</p>
            <p className="mt-2 inline-flex items-center gap-2 font-bold text-amber-700">
              <Clock3 aria-hidden="true" className="size-4" /> تجريبية محلية
            </p>
          </CardContent>
        </Card>
      </div>
      <Button asChild variant="secondary" className="mt-5">
        <Link href="/profile">
          إدارة بيانات الدخول{" "}
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Link>
      </Button>
    </section>
  );
}
