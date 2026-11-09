import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AdminTaskManager,
  ReviewQueue,
  TaskDetails,
  TaskMarketplace,
} from "@/components/mvp/tasks";
import {
  LOCAL_DEMO_STORAGE_KEY,
  MvpProvider,
} from "@/components/mvp/mvp-provider";
import { WorkerDashboard } from "@/components/mvp/dashboard";
import type { DemoState } from "@/lib/mvp/model";

const storageKey = LOCAL_DEMO_STORAGE_KEY;

function readState(): DemoState {
  return JSON.parse(
    window.localStorage.getItem(storageKey) ?? "null",
  ) as DemoState;
}

describe("client-only MVP task flow", () => {
  beforeEach(() => window.localStorage.removeItem(storageKey));
  afterEach(() => {
    cleanup();
    window.localStorage.removeItem(storageKey);
  });

  it("publishes a task, accepts evidence, reviews it, and records the worker reward", async () => {
    render(
      <MvpProvider userId="manager-1" canManageTasks demoMode>
        <AdminTaskManager />
      </MvpProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /مهمة جديدة/ }));
    fireEvent.change(screen.getByLabelText(/عنوان المهمة/), {
      target: { value: "مهمة اختبار" },
    });
    fireEvent.change(screen.getByLabelText(/رابط المهمة الآمن/), {
      target: { value: "https://example.com/work" },
    });
    fireEvent.change(screen.getByLabelText(/وصف مختصر/), {
      target: { value: "وصف موجز للاختبار" },
    });
    fireEvent.change(screen.getByLabelText(/الوصف الكامل/), {
      target: { value: "تفاصيل المهمة التجريبية" },
    });
    fireEvent.change(screen.getByLabelText(/تعليمات الإنجاز/), {
      target: { value: "اتبع التعليمات ثم أرسل الإثبات" },
    });
    fireEvent.click(screen.getByRole("button", { name: /حفظ المهمة/ }));

    const task = readState().tasks[0];
    expect(task).toMatchObject({
      title: "مهمة اختبار",
      active: true,
      rewardBaseIqd: 250,
      createdBy: "manager-1",
    });

    cleanup();
    render(
      <MvpProvider userId="worker-1" demoMode>
        <TaskMarketplace />
      </MvpProvider>,
    );
    expect(
      await screen.findByRole("heading", { name: "مهمة اختبار" }),
    ).toBeInTheDocument();

    cleanup();
    render(
      <MvpProvider userId="worker-1" demoMode>
        <TaskDetails taskId={task.id} />
      </MvpProvider>,
    );
    fireEvent.change(screen.getByLabelText(/ملاحظات للمراجع/), {
      target: { value: "أنجزت المطلوب" },
    });
    fireEvent.click(screen.getByRole("button", { name: "إرسال للمراجعة" }));
    expect(
      await screen.findByText("مشاركتك قيد المراجعة."),
    ).toBeInTheDocument();
    expect(readState().submissions[0].status).toBe("pending");
    const queuedState = readState();
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...queuedState,
        tasks: queuedState.tasks.map((item) => ({
          ...item,
          rewardBaseIqd: 900,
        })),
      }),
    );

    cleanup();
    render(
      <MvpProvider userId="reviewer-1" canReviewTasks demoMode>
        <ReviewQueue />
      </MvpProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /اعتماد/ }));
    expect(
      await screen.findByText("لا توجد مشاركات قيد المراجعة"),
    ).toBeInTheDocument();
    expect(readState().submissions[0]).toMatchObject({
      status: "approved",
      rewardIqd: 250,
      reviewedBy: "reviewer-1",
    });

    cleanup();
    render(
      <MvpProvider userId="worker-1" demoMode>
        <WorkerDashboard />
      </MvpProvider>,
    );
    expect(await screen.findAllByText(/٢٥٠ د\.ع/)).not.toHaveLength(0);
  });

  it("blocks self-review and records the mandatory rejection reason", async () => {
    const task = {
      id: "task-a",
      title: "مهمة",
      summary: "وصف",
      description: "تفاصيل",
      externalUrl: "https://example.com",
      instructions: "تعليمات",
      rewardBaseIqd: 250,
      evidenceRequired: true,
      active: true,
      createdBy: "manager-a",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const pending = {
      id: "submission-a",
      taskId: task.id,
      userId: "worker-a",
      evidenceText: "إثبات",
      evidenceUrl: null,
      rewardBaseIqdSnapshot: 250,
      rewardMultiplierSnapshot: 1,
      status: "pending" as const,
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
      rewardIqd: null,
    };
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        schemaVersion: 1,
        tasks: [task],
        submissions: [pending],
      }),
    );

    render(
      <MvpProvider userId="worker-a" canReviewTasks demoMode>
        <ReviewQueue />
      </MvpProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /اعتماد/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "لا يمكنك مراجعة مشاركتك",
    );
    expect(readState().submissions[0].status).toBe("pending");

    cleanup();
    render(
      <MvpProvider userId="reviewer-a" canReviewTasks demoMode>
        <ReviewQueue />
      </MvpProvider>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /رفض المشاركة/ }),
    );
    expect(
      await screen.findAllByText("اكتب سبب الرفض ليظهر لصاحب المشاركة."),
    ).not.toHaveLength(0);
    fireEvent.change(screen.getByLabelText(/سبب الرفض/), {
      target: { value: "الإثبات غير كافٍ" },
    });
    fireEvent.click(screen.getByRole("button", { name: /رفض المشاركة/ }));
    expect(
      await screen.findByText("لا توجد مشاركات قيد المراجعة"),
    ).toBeInTheDocument();
    expect(readState().submissions[0]).toMatchObject({
      status: "rejected",
      rejectionReason: "الإثبات غير كافٍ",
      rewardIqd: null,
    });
  });

  it("keeps another pending submission when the worker hits the rolling approval cooldown", async () => {
    const now = new Date().toISOString();
    const task = (id: string) => ({
      id,
      title: `مهمة ${id}`,
      summary: "وصف",
      description: "تفاصيل",
      externalUrl: "https://example.com",
      instructions: "تعليمات",
      rewardBaseIqd: 250,
      evidenceRequired: true,
      active: true,
      createdBy: "manager-a",
      createdAt: now,
      updatedAt: now,
    });
    const submission = (id: string, taskId: string) => ({
      id,
      taskId,
      userId: "worker-a",
      evidenceText: "إثبات",
      evidenceUrl: null,
      rewardBaseIqdSnapshot: 250,
      rewardMultiplierSnapshot: 1,
      status: "pending" as const,
      submittedAt: now,
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
      rewardIqd: null,
    });
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        schemaVersion: 1,
        tasks: [task("task-1"), task("task-2")],
        submissions: [
          submission("submission-1", "task-1"),
          submission("submission-2", "task-2"),
        ],
      }),
    );

    render(
      <MvpProvider userId="reviewer-a" canReviewTasks demoMode>
        <ReviewQueue />
      </MvpProvider>,
    );
    fireEvent.click(
      (await screen.findAllByRole("button", { name: /اعتماد/ }))[0],
    );
    fireEvent.click(await screen.findByRole("button", { name: /اعتماد/ }));
    expect(
      await screen.findByText(
        "تتعذر الموافقة قبل انتهاء فترة 24 ساعة من آخر موافقة.",
      ),
    ).toBeInTheDocument();
    expect(readState().submissions.map((item) => item.status)).toEqual([
      "approved",
      "pending",
    ]);
  });
});
