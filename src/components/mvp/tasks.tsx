"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  FileText,
  Plus,
  Search,
  SquareArrowOutUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { initialTaskFormValues, useMvp } from "@/components/mvp/mvp-provider";
import type { DemoTask } from "@/lib/mvp/model";
import { formatIqd } from "@/lib/mvp/model";

export function TaskMarketplace() {
  const { state, ready, demoMode } = useMvp();
  const [query, setQuery] = useState("");
  const tasks = useMemo(
    () =>
      state.tasks.filter(
        (task) =>
          task.active &&
          `${task.title} ${task.summary}`
            .toLocaleLowerCase("ar")
            .includes(query.trim().toLocaleLowerCase("ar")),
      ),
    [query, state.tasks],
  );

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-6">
        <p className="text-sm font-semibold text-emerald-700">فرص اليوم</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
          المهام المتاحة
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          اطّلع على التعليمات والمكافأة قبل الانتقال إلى رابط المهمة.
        </p>
      </div>

      <label className="mb-5 flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 focus-within:ring-2 focus-within:ring-emerald-600">
        <Search aria-hidden="true" className="size-5 text-slate-400" />
        <span className="sr-only">ابحث في المهام</span>
        <input
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ابحث عن مهمة"
        />
      </label>

      {!ready ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500">
          جارٍ تحميل المهام…
        </p>
      ) : null}
      {ready && tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center px-5 py-12 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
              <FileText aria-hidden="true" className="size-6" />
            </span>
            <h2 className="mt-4 text-lg font-bold">لا توجد مهام متاحة الآن</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              ستظهر هنا المهام التي يضيفها مدير مخوّل ويفعّلها.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:gap-4">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold sm:text-lg">
                    {task.title}
                  </h2>
                  {demoMode ? (
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-rose-700">
                      DEMO
                    </span>
                  ) : null}
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    نشطة
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-500">
                  {task.summary}
                </p>
                <p className="mt-3 text-sm font-bold text-emerald-700">
                  {demoMode ? "مكافأة DEMO: " : "المكافأة: "}
                  {formatIqd(task.rewardBaseIqd)}{" "}
                  <span className="font-normal text-slate-400">
                    · المضاعف الحالي 1×
                  </span>
                </p>
              </div>
              <Button asChild variant="secondary" className="shrink-0">
                <Link href={`/tasks/${encodeURIComponent(task.id)}`}>
                  عرض التفاصيل{" "}
                  <ArrowLeft aria-hidden="true" className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function TaskDetails({ taskId }: { taskId: string }) {
  const { state, userId, submitEvidence, ready, demoMode } = useMvp();
  const task = state.tasks.find((item) => item.id === taskId);
  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const previous = state.submissions.filter(
    (item) => item.userId === userId && item.taskId === taskId,
  );
  const pending = previous.some((item) => item.status === "pending");
  const completed = previous.some((item) => item.status === "approved");
  const rejected = previous.find((item) => item.status === "rejected");

  if (!ready)
    return (
      <p className="mx-auto max-w-3xl rounded-2xl bg-white p-6 text-center text-sm text-slate-500">
        جارٍ تحميل تفاصيل المهمة…
      </p>
    );
  if (!task) {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardContent className="p-6 text-center">
          <h1 className="text-xl font-bold">لم نعثر على المهمة</h1>
          <Link
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-semibold text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
            href="/tasks"
          >
            العودة إلى المهام{" "}
            <ArrowLeft aria-hidden="true" className="size-4" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  const canSubmit = task.active && !pending && !completed && !rejected;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task) return;
    const result = submitEvidence({
      taskId: task.id,
      evidenceText,
      evidenceUrl,
    });
    setMessage({
      type: result.ok ? "success" : "error",
      text: result.ok
        ? "تم إرسال المشاركة إلى قائمة المراجعة التجريبية."
        : (result.message ?? "تعذّر إرسال المشاركة."),
    });
    if (result.ok) {
      setEvidenceText("");
      setEvidenceUrl("");
    }
  }

  return (
    <article className="mx-auto max-w-3xl">
      <Link
        href="/tasks"
        className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-semibold text-slate-500 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
      >
        <ArrowLeft aria-hidden="true" className="size-4" /> كل المهام
      </Link>
      <Card className="mt-4">
        <CardContent className="p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${task.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
              >
                {demoMode ? "DEMO · " : ""}
                {task.active ? "نشطة" : "متوقفة"}
              </span>
              <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {task.title}
              </h1>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                {task.summary}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-end">
              <p className="text-xs font-medium text-emerald-800">
                {demoMode ? "مكافأتك · DEMO" : "مكافأتك"}
              </p>
              <p className="mt-1 text-lg font-extrabold text-emerald-900">
                {formatIqd(task.rewardBaseIqd)}
              </p>
              <p className="text-xs text-emerald-800">على المضاعف الحالي 1×</p>
            </div>
          </div>

          <div className="mt-7 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2">
            <section>
              <h2 className="font-bold">تفاصيل المهمة</h2>
              <p className="mt-2 text-sm leading-7 whitespace-pre-wrap text-slate-600">
                {task.description}
              </p>
            </section>
            <section>
              <h2 className="font-bold">طريقة الإنجاز</h2>
              <p className="mt-2 text-sm leading-7 whitespace-pre-wrap text-slate-600">
                {task.instructions}
              </p>
            </section>
          </div>

          <a
            href={task.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-800 hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none sm:w-auto"
          >
            فتح رابط المهمة{" "}
            <SquareArrowOutUpRight aria-hidden="true" className="size-4" />
          </a>
          <p className="mt-2 text-xs break-all text-slate-400" dir="ltr">
            {task.externalUrl}
          </p>

          <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            <h2 className="font-bold text-slate-900">الإثبات المطلوب</h2>
            {task.evidenceRequired ? (
              <p className="mt-1">
                أرسل وصفاً لما أنجزته أو رابطاً آمناً يراجعه الفريق. رفع الملفات
                غير مفعّل في هذا النموذج.
              </p>
            ) : (
              <p className="mt-1">
                الإثبات غير إلزامي لهذه المهمة، لكن يمكنك إضافة ملاحظة للمراجع.
              </p>
            )}
          </div>

          {pending ? (
            <div
              role="status"
              className="mt-5 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900"
            >
              مشاركتك قيد المراجعة.
            </div>
          ) : null}
          {completed ? (
            <div
              role="status"
              className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"
            >
              سبق اعتماد مشاركتك. لا يمكن إنشاء محاولة أخرى لهذه المهمة.
            </div>
          ) : null}
          {rejected ? (
            <div
              role="status"
              className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-900"
            >
              <strong>مرفوضة:</strong>{" "}
              {rejected.rejectionReason || "لم يرفق المراجع سبباً."}
              <p className="mt-1 text-xs">
                إعادة المحاولة غير متاحة ما لم تضف سياسة معتمدة في نسخة لاحقة.
              </p>
            </div>
          ) : null}

          {canSubmit ? (
            <form
              className="mt-6 space-y-4 border-t border-slate-100 pt-6"
              onSubmit={handleSubmit}
            >
              <h2 className="text-lg font-bold">إرسال إثبات الإنجاز</h2>
              <label className="block text-sm font-semibold">
                ملاحظات للمراجع{task.evidenceRequired ? " *" : ""}
                <textarea
                  required={task.evidenceRequired}
                  value={evidenceText}
                  onChange={(event) => setEvidenceText(event.target.value)}
                  rows={4}
                  maxLength={2000}
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="اكتب ما أنجزته أو أضف تفاصيل تساعد على التحقق…"
                />
              </label>
              <label className="block text-sm font-semibold">
                رابط إثبات اختياري
                <input
                  type="url"
                  inputMode="url"
                  dir="ltr"
                  value={evidenceUrl}
                  onChange={(event) => setEvidenceUrl(event.target.value)}
                  className="mt-2 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-start text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="https://"
                />
              </label>
              {message ? (
                <p
                  role={message.type === "error" ? "alert" : "status"}
                  className={`text-sm ${message.type === "error" ? "text-rose-700" : "text-emerald-700"}`}
                >
                  {message.text}
                </p>
              ) : null}
              <Button
                type="submit"
                className="w-full bg-rose-500 hover:bg-rose-600 sm:w-auto"
              >
                إرسال للمراجعة
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </article>
  );
}

function TaskForm({
  task,
  onCancel,
}: {
  task: DemoTask | null;
  onCancel: () => void;
}) {
  const { createTask, updateTask } = useMvp();
  const [form, setForm] = useState({
    ...initialTaskFormValues,
    ...(task ?? {}),
  });
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      title: form.title.trim(),
      summary: form.summary.trim(),
      description: form.description.trim(),
      externalUrl: form.externalUrl.trim(),
      instructions: form.instructions.trim(),
      rewardBaseIqd: Number(form.rewardBaseIqd),
      evidenceRequired: form.evidenceRequired,
      active: form.active,
    };
    if (
      !payload.title ||
      !payload.summary ||
      !payload.description ||
      !payload.instructions
    ) {
      setMessage("أكمل الحقول المطلوبة قبل الحفظ.");
      return;
    }
    const result = task ? updateTask(task.id, payload) : createTask(payload);
    if (!result.ok) {
      setMessage(result.message ?? "تعذّر حفظ المهمة.");
      return;
    }
    setMessage("");
    onCancel();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
    >
      <h2 className="text-lg font-bold">
        {task ? "تعديل المهمة" : "إضافة مهمة"}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          عنوان المهمة *
          <input
            required
            maxLength={100}
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
            className="mt-2 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </label>
        <label className="text-sm font-semibold">
          رابط المهمة الآمن *
          <input
            required
            type="url"
            inputMode="url"
            dir="ltr"
            placeholder="https://"
            value={form.externalUrl}
            onChange={(event) =>
              setForm({ ...form, externalUrl: event.target.value })
            }
            className="mt-2 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-start font-normal outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        وصف مختصر *
        <input
          required
          maxLength={220}
          value={form.summary}
          onChange={(event) =>
            setForm({ ...form, summary: event.target.value })
          }
          className="mt-2 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:ring-2 focus:ring-emerald-600"
        />
      </label>
      <label className="block text-sm font-semibold">
        الوصف الكامل *
        <textarea
          required
          maxLength={4000}
          rows={3}
          value={form.description}
          onChange={(event) =>
            setForm({ ...form, description: event.target.value })
          }
          className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 leading-6 font-normal outline-none focus:ring-2 focus:ring-emerald-600"
        />
      </label>
      <label className="block text-sm font-semibold">
        تعليمات الإنجاز *
        <textarea
          required
          maxLength={4000}
          rows={3}
          value={form.instructions}
          onChange={(event) =>
            setForm({ ...form, instructions: event.target.value })
          }
          className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 leading-6 font-normal outline-none focus:ring-2 focus:ring-emerald-600"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          المكافأة الأساسية (دينار عراقي) *
          <input
            required
            type="number"
            min={0}
            step={1}
            value={form.rewardBaseIqd}
            onChange={(event) =>
              setForm({ ...form, rewardBaseIqd: Number(event.target.value) })
            }
            className="mt-2 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </label>
        <div className="flex flex-col gap-3 self-end pb-1">
          <label className="inline-flex min-h-8 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.evidenceRequired}
              onChange={(event) =>
                setForm({ ...form, evidenceRequired: event.target.checked })
              }
              className="size-4 accent-emerald-700"
            />{" "}
            يتطلب إثبات إنجاز
          </label>
          <label className="inline-flex min-h-8 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                setForm({ ...form, active: event.target.checked })
              }
              className="size-4 accent-emerald-700"
            />{" "}
            تفعيل المهمة بعد الحفظ
          </label>
        </div>
      </div>
      {message ? (
        <p role="alert" className="text-sm text-rose-700">
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit">
          <Check aria-hidden="true" className="size-4" /> حفظ المهمة
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}

export function AdminTaskManager() {
  const { state, ready, setTaskActive, demoMode } = useMvp();
  const [formTask, setFormTask] = useState<DemoTask | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            إدارة المحتوى
          </p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
            إدارة المهام
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            أضف رابطاً وتعليمات واضحة؛ ستظهر المهمة النشطة في السوق المحلي
            للنموذج.
          </p>
        </div>
        {!showForm ? (
          <Button
            disabled={!ready}
            onClick={() => {
              setFormTask(null);
              setShowForm(true);
            }}
            className="bg-rose-500 hover:bg-rose-600"
          >
            <Plus aria-hidden="true" className="size-4" /> مهمة جديدة
          </Button>
        ) : null}
      </div>
      {showForm ? (
        <div className="mb-6">
          <TaskForm
            task={formTask}
            onCancel={() => {
              setShowForm(false);
              setFormTask(null);
            }}
          />
        </div>
      ) : null}
      {!ready ? (
        <p className="rounded-2xl bg-white p-5 text-sm text-slate-500">
          جارٍ تحميل المهام…
        </p>
      ) : null}
      {ready && state.tasks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="font-bold">لا توجد مهام مضافة بعد</p>
            <p className="mt-2 text-sm text-slate-500">
              أضف مهمة لتظهر في سوق المهام.
            </p>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-3">
        {state.tasks.map((task) => (
          <Card key={task.id}>
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold">{task.title}</h2>
                  {demoMode ? (
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-rose-700">
                      DEMO
                    </span>
                  ) : null}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${task.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {task.active ? "نشطة" : "متوقفة"}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-slate-500" dir="ltr">
                  {task.externalUrl}
                </p>
                <p className="mt-2 text-sm font-semibold text-emerald-700">
                  {formatIqd(task.rewardBaseIqd)} · مضاعف الاشتراك في النموذج 1×
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setFormTask(task);
                    setShowForm(true);
                  }}
                >
                  تعديل
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setTaskActive(task.id, !task.active)}
                >
                  {task.active ? "إيقاف" : "تفعيل"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function ReviewQueue() {
  const { state, userId, ready, reviewSubmission, demoMode, canReviewTasks } =
    useMvp();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const pending = state.submissions.filter(
    (submission) => submission.status === "pending",
  );

  if (demoMode && !canReviewTasks) {
    return (
      <p
        role="status"
        className="rounded-2xl bg-white p-5 text-sm text-slate-600"
      >
        استخدم حساب المراجع التجريبي لمراجعة المشاركات · DEMO.
      </p>
    );
  }

  function decide(id: string, decision: "approved" | "rejected") {
    const result = reviewSubmission(id, decision, reasons[id] ?? "");
    setMessages((current) => ({
      ...current,
      [id]: result.ok
        ? "تم تسجيل القرار في بيانات النموذج المحلية."
        : (result.message ?? "تعذّر تنفيذ القرار."),
    }));
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-6">
        <p className="text-sm font-semibold text-emerald-700">
          مراجعة المشاركات
        </p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
          قائمة المراجعة
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          هذه المراجعة تجريبية على بيانات المتصفح؛ لا توجد leases أو قرارات
          مالية موثوقة في هذا النموذج.
        </p>
      </div>
      {!ready ? (
        <p className="rounded-2xl bg-white p-5 text-sm text-slate-500">
          جارٍ تحميل المشاركات…
        </p>
      ) : null}
      {ready && pending.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="font-bold">لا توجد مشاركات قيد المراجعة</p>
            <p className="mt-2 text-sm text-slate-500">
              ستظهر المشاركات الجديدة هنا.
            </p>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-4">
        {pending.map((submission) => {
          const task = state.tasks.find(
            (item) => item.id === submission.taskId,
          );
          const blocked =
            submission.userId === userId || task?.createdBy === userId;
          return (
            <Card key={submission.id}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">
                      {task?.title ?? "مهمة غير متاحة"}
                    </h2>
                    {demoMode ? (
                      <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-extrabold text-rose-700">
                        DEMO
                      </span>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-500">
                      {demoMode ? "العامل التجريبي · DEMO · " : ""}
                      وقت الإرسال:{" "}
                      <time dateTime={submission.submittedAt}>
                        {new Date(submission.submittedAt).toLocaleString(
                          "ar-IQ",
                        )}
                      </time>
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    قيد المراجعة
                  </span>
                </div>
                <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6">
                  <p className="font-semibold">إثبات الإنجاز</p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-700">
                    {submission.evidenceText || "لم يضف العامل ملاحظات."}
                  </p>
                  {submission.evidenceUrl ? (
                    <a
                      className="mt-2 inline-flex items-center gap-2 break-all text-emerald-700 underline focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                      href={submission.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      dir="ltr"
                    >
                      {submission.evidenceUrl}
                      <ExternalLink
                        aria-hidden="true"
                        className="size-4 shrink-0"
                      />
                    </a>
                  ) : null}
                </div>
                <label className="mt-4 block text-sm font-semibold">
                  سبب الرفض (يُطلب عند الرفض)
                  <textarea
                    rows={2}
                    maxLength={1000}
                    value={reasons[submission.id] ?? ""}
                    onChange={(event) =>
                      setReasons((current) => ({
                        ...current,
                        [submission.id]: event.target.value,
                      }))
                    }
                    className="mt-2 block w-full rounded-xl border border-slate-200 px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </label>
                {blocked ? (
                  <p role="alert" className="mt-3 text-sm text-rose-700">
                    لا يمكنك مراجعة مشاركتك أو مهمة أنشأتها. يلزم مراجع مخوّل
                    آخر.
                  </p>
                ) : null}
                {messages[submission.id] ? (
                  <p role="status" className="mt-3 text-sm text-slate-600">
                    {messages[submission.id]}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    disabled={blocked}
                    onClick={() => decide(submission.id, "approved")}
                    className="bg-emerald-700 hover:bg-emerald-800"
                  >
                    <Check aria-hidden="true" className="size-4" /> اعتماد
                  </Button>
                  <Button
                    disabled={blocked}
                    variant="secondary"
                    onClick={() => decide(submission.id, "rejected")}
                  >
                    رفض المشاركة
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
