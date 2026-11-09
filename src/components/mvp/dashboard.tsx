"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Clock3,
  Coins,
  ClipboardList,
  ExternalLink,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMvp } from "@/components/mvp/mvp-provider";
import {
  formatIqd,
  formatRemainingTime,
  getApprovalEligibility,
} from "@/lib/mvp/model";

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "slate",
  detail,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  tone?: "slate" | "rose" | "emerald" | "violet";
  detail?: string;
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    rose: "bg-rose-50 text-rose-500",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <Card className="min-w-0">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-slate-500">{label}</span>
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-xl ${tones[tone]}`}
          >
            <Icon aria-hidden="true" className="size-[18px]" />
          </span>
        </div>
        <p
          className="mt-4 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl"
          dir="auto"
        >
          {value}
        </p>
        {detail ? (
          <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function WorkerDashboard() {
  const { userId, state, ready, storageAvailable, canManageTasks, demoMode } =
    useMvp();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const ownSubmissions = useMemo(
    () =>
      state.submissions.filter((submission) => submission.userId === userId),
    [state.submissions, userId],
  );
  const approved = ownSubmissions.filter(
    (submission) => submission.status === "approved",
  );
  const earnings = approved.reduce(
    (sum, submission) => sum + (submission.rewardIqd ?? 0),
    0,
  );
  const eligibility = getApprovalEligibility(ownSubmissions, userId, now);
  const activeTasks = state.tasks.filter((task) => task.active).length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">مساحة العامل</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
            أهلاً بك في شغلني
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            تابع مهامك ومشاركاتك ومكافآتك التجريبية من مكان واحد.
          </p>
        </div>
        <Link
          href="/tasks"
          className="hidden items-center gap-2 text-sm font-semibold text-slate-600 hover:text-rose-600 md:inline-flex"
        >
          تصفح المهام <ArrowLeft aria-hidden="true" className="size-4" />
        </Link>
      </div>

      {!storageAvailable ? (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          تعذّر حفظ بيانات النموذج في هذا المتصفح. يمكنك المتابعة للعرض، لكن
          التغييرات لن تكون دائمة.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          label={demoMode ? "الرصيد · DEMO" : "الرصيد التجريبي"}
          value={formatIqd(earnings)}
          icon={Wallet}
          tone="rose"
          detail={
            demoMode
              ? "مكافآت DEMO محلية فقط"
              : "مجموع المكافآت المعتمدة محلياً"
          }
        />
        <StatCard
          label="الوقت حتى الموافقة التالية"
          value={
            eligibility.eligible
              ? "متاح الآن"
              : formatRemainingTime(eligibility.remainingMs)
          }
          icon={Clock3}
          tone="emerald"
          detail={
            eligibility.eligible
              ? "لا توجد موافقة خلال آخر 24 ساعة"
              : "من وقت آخر موافقة"
          }
        />
        <StatCard
          label={demoMode ? "المهام المتاحة · DEMO" : "المهام المتاحة"}
          value={ready ? String(activeTasks) : "…"}
          icon={ClipboardList}
          tone="violet"
          detail="المهام النشطة في هذا المتصفح"
        />
        <StatCard
          label={demoMode ? "ربح المهمة · DEMO" : "ربح المهمة"}
          value={formatIqd(250)}
          icon={Coins}
          tone="emerald"
          detail={
            demoMode
              ? "مكافأة DEMO · المضاعف 1×"
              : "أساس المهمة × مضاعفك الحالي 1×"
          }
        />
        <StatCard
          label="الاشتراكات النشطة"
          value="غير متاح"
          icon={BadgeCheck}
          detail="بيانات الاشتراك غير موصولة في هذا النموذج"
        />
        <StatCard
          label={demoMode ? "إجمالي الربح · DEMO" : "إجمالي الربح"}
          value={formatIqd(earnings)}
          icon={Coins}
          tone="slate"
          detail="قيمة توضيحية وليست رصيداً مالياً موثوقاً"
        />
      </div>

      <Card className="mt-5 border-emerald-100 bg-emerald-50/70 shadow-none">
        <CardContent className="flex items-start gap-3 p-4 sm:p-5">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-emerald-700"
          />
          <div className="text-sm leading-6">
            <p className="font-bold text-emerald-950">
              مكافأتك مرتبطة باشتراكك أنت
            </p>
            <p className="mt-1 text-emerald-900/80">
              لا توجد بيانات باقة موثقة حالياً، لذلك يُستخدم المضاعف الافتراضي
              1×. لن نعرض مزايا أو أسعاراً غير مهيأة.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button
          asChild
          className="min-h-[3.25rem] rounded-2xl bg-rose-500 text-base shadow-sm hover:bg-rose-600"
        >
          <Link href="/tasks">
            <ClipboardList aria-hidden="true" className="size-5" />
            عرض المهام
          </Link>
        </Button>
        {canManageTasks ? (
          <Button
            asChild
            variant="secondary"
            className="min-h-[3.25rem] rounded-2xl border-0 bg-slate-900 text-base text-white hover:bg-slate-800"
          >
            <Link href="/admin">
              <ExternalLink aria-hidden="true" className="size-4" />
              لوحة التحكم
            </Link>
          </Button>
        ) : (
          <Button
            asChild
            variant="secondary"
            className="min-h-[3.25rem] rounded-2xl"
          >
            <Link href="/submissions">متابعة مشاركاتي</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
