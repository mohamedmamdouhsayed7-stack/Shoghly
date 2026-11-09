"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  BASE_TASK_REWARD_IQD,
  calculateRewardIqd,
  getDemoVerifiedSubscriptionMultiplier,
  getApprovalEligibility,
  isValidExternalUrl,
  type DemoState,
  type DemoSubmission,
  type DemoTask,
} from "@/lib/mvp/model";
import { z } from "zod";

const STORAGE_KEY = "shoghly.mvp.demo.v1";
export const LOCAL_DEMO_STORAGE_KEY = "shoghly.mvp.local-demo.v1";
const CHANGE_EVENT = "shoghly-demo-state-change";
const STORAGE_UNAVAILABLE = "__shoghly_demo_storage_unavailable__";
const lastWriteSucceeded = new Map<string, boolean>();
const volatileSnapshots = new Map<string, string>();
const EMPTY_STATE: DemoState = { schemaVersion: 1, tasks: [], submissions: [] };
const demoTaskSchema = z
  .object({
    id: z.string(),
    title: z.string().max(100),
    summary: z.string().max(220),
    description: z.string().max(4000),
    externalUrl: z.string().url().refine(isValidExternalUrl),
    instructions: z.string().max(4000),
    rewardBaseIqd: z.number().int().nonnegative().safe(),
    evidenceRequired: z.boolean(),
    active: z.boolean(),
    createdBy: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();
const demoSubmissionSchema = z
  .object({
    id: z.string(),
    taskId: z.string(),
    userId: z.string(),
    evidenceText: z.string().max(2000),
    evidenceUrl: z
      .string()
      .nullable()
      .refine((value) => !value || isValidExternalUrl(value)),
    rewardBaseIqdSnapshot: z.number().int().nonnegative().safe(),
    rewardMultiplierSnapshot: z.number().positive().finite(),
    status: z.enum(["pending", "approved", "rejected"]),
    submittedAt: z.string(),
    reviewedAt: z.string().nullable(),
    reviewedBy: z.string().nullable(),
    rejectionReason: z.string().nullable(),
    rewardIqd: z.number().int().nonnegative().safe().nullable(),
  })
  .strict();
const demoStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    tasks: z.array(demoTaskSchema),
    submissions: z.array(demoSubmissionSchema),
  })
  .strict();

function subscribeToDemoState(callback: () => void, storageKey: string) {
  if (typeof window === "undefined") return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) callback();
  };
  const handleDemoChange = (event: Event) => {
    if ((event as CustomEvent<string>).detail === storageKey) callback();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, handleDemoChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, handleDemoChange);
  };
}

function getDemoSnapshot(storageKey: string): string {
  if (lastWriteSucceeded.get(storageKey) === false) {
    const volatileSnapshot = volatileSnapshots.get(storageKey);
    if (volatileSnapshot !== undefined) return volatileSnapshot;
  }
  try {
    return window.localStorage.getItem(storageKey) ?? "";
  } catch {
    return STORAGE_UNAVAILABLE;
  }
}

function getServerDemoSnapshot(): null {
  return null;
}

function getWriteStatusSnapshot(storageKey: string): boolean {
  return lastWriteSucceeded.get(storageKey) ?? true;
}

function getServerWriteStatusSnapshot(): true {
  return true;
}

type CreateTaskInput = Pick<
  DemoTask,
  | "title"
  | "summary"
  | "description"
  | "externalUrl"
  | "instructions"
  | "rewardBaseIqd"
  | "evidenceRequired"
  | "active"
>;

type MvpContextValue = {
  userId: string;
  canManageTasks: boolean;
  canReviewTasks: boolean;
  demoMode: boolean;
  ready: boolean;
  state: DemoState;
  storageAvailable: boolean;
  createTask: (input: CreateTaskInput) => { ok: boolean; message?: string };
  updateTask: (
    taskId: string,
    input: CreateTaskInput,
  ) => { ok: boolean; message?: string };
  submitEvidence: (input: {
    taskId: string;
    evidenceText: string;
    evidenceUrl: string;
  }) => { ok: boolean; message?: string };
  reviewSubmission: (
    submissionId: string,
    decision: "approved" | "rejected",
    reason: string,
  ) => { ok: boolean; message?: string };
  setTaskActive: (taskId: string, active: boolean) => void;
};

const MvpContext = createContext<MvpContextValue | null>(null);

function parseDemoState(value: string | null): DemoState {
  if (!value) return EMPTY_STATE;
  try {
    const parsed: unknown = JSON.parse(value);
    const validated = demoStateSchema.safeParse(parsed);
    if (validated.success) return validated.data;
  } catch {
    return EMPTY_STATE;
  }
  return EMPTY_STATE;
}

function makeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function MvpProvider({
  userId,
  canManageTasks = false,
  canReviewTasks = false,
  demoMode = false,
  children,
}: {
  userId: string;
  canManageTasks?: boolean;
  canReviewTasks?: boolean;
  demoMode?: boolean;
  children: ReactNode;
}) {
  const storageKey = demoMode ? LOCAL_DEMO_STORAGE_KEY : STORAGE_KEY;
  const subscribe = useCallback(
    (callback: () => void) => subscribeToDemoState(callback, storageKey),
    [storageKey],
  );
  const getSnapshot = useCallback(
    () => (demoMode ? getDemoSnapshot(storageKey) : ""),
    [demoMode, storageKey],
  );
  const getWriteStatus = useCallback(
    () => getWriteStatusSnapshot(storageKey),
    [storageKey],
  );
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerDemoSnapshot,
  );
  const state = parseDemoState(snapshot);
  const stateRef = useRef<DemoState>(EMPTY_STATE);
  const writeStatus = useSyncExternalStore(
    subscribe,
    getWriteStatus,
    getServerWriteStatusSnapshot,
  );
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const ready = snapshot !== null;
  const storageAvailable =
    demoMode && snapshot !== STORAGE_UNAVAILABLE && writeStatus;

  const commit = useCallback(
    (update: (current: DemoState) => DemoState) => {
      if (!demoMode) return;
      const nextState = update(stateRef.current);
      stateRef.current = nextState;
      const serialized = JSON.stringify(nextState);
      volatileSnapshots.set(storageKey, serialized);
      try {
        window.localStorage.setItem(storageKey, serialized);
        lastWriteSucceeded.set(storageKey, true);
        volatileSnapshots.delete(storageKey);
      } catch {
        // The UI keeps the in-memory state but identifies it as non-persistent.
        lastWriteSucceeded.set(storageKey, false);
      }
      window.dispatchEvent(
        new CustomEvent(CHANGE_EVENT, { detail: storageKey }),
      );
    },
    [demoMode, storageKey],
  );

  const createTask = useCallback(
    (input: CreateTaskInput) => {
      if (!demoMode)
        return {
          ok: false,
          message: "الخدمات الخلفية غير متصلة بعد. لم يتم حفظ أي تغيير.",
        };
      if (!isValidExternalUrl(input.externalUrl)) {
        return { ok: false, message: "أدخل رابطاً آمناً يبدأ بـ https://." };
      }
      if (
        !Number.isSafeInteger(input.rewardBaseIqd) ||
        input.rewardBaseIqd < 0
      ) {
        return { ok: false, message: "أدخل مكافأة صحيحة بالدينار العراقي." };
      }
      const now = new Date().toISOString();
      const task: DemoTask = {
        ...input,
        id: makeId(),
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      };
      commit((current) => ({
        ...current,
        tasks: [task, ...current.tasks],
      }));
      return { ok: true };
    },
    [commit, demoMode, userId],
  );

  const updateTask = useCallback(
    (taskId: string, input: CreateTaskInput) => {
      if (!demoMode)
        return {
          ok: false,
          message: "الخدمات الخلفية غير متصلة بعد. لم يتم حفظ أي تغيير.",
        };
      if (!isValidExternalUrl(input.externalUrl)) {
        return { ok: false, message: "أدخل رابطاً آمناً يبدأ بـ https://." };
      }
      if (
        !Number.isSafeInteger(input.rewardBaseIqd) ||
        input.rewardBaseIqd < 0
      ) {
        return { ok: false, message: "أدخل مكافأة صحيحة بالدينار العراقي." };
      }
      commit((current) => ({
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === taskId
            ? { ...task, ...input, updatedAt: new Date().toISOString() }
            : task,
        ),
      }));
      return { ok: true };
    },
    [commit, demoMode],
  );

  const submitEvidence = useCallback(
    (input: { taskId: string; evidenceText: string; evidenceUrl: string }) => {
      if (!demoMode)
        return {
          ok: false,
          message: "الخدمات الخلفية غير متصلة بعد. لم يتم إرسال المشاركة.",
        };
      const task = state.tasks.find(
        (candidate) => candidate.id === input.taskId && candidate.active,
      );
      if (!task) return { ok: false, message: "هذه المهمة غير متاحة حالياً." };

      const prior = state.submissions.filter(
        (submission) =>
          submission.userId === userId && submission.taskId === task.id,
      );
      if (prior.some((submission) => submission.status === "pending")) {
        return { ok: false, message: "لديك مشاركة قيد المراجعة لهذه المهمة." };
      }
      if (prior.some((submission) => submission.status === "approved")) {
        return { ok: false, message: "سبق اعتماد مشاركتك في هذه المهمة." };
      }
      if (prior.some((submission) => submission.status === "rejected")) {
        return {
          ok: false,
          message:
            "إعادة المحاولة غير مفعّلة لهذه المهمة في هذا النموذج الأولي.",
        };
      }
      if (
        task.evidenceRequired &&
        !input.evidenceText.trim() &&
        !input.evidenceUrl.trim()
      ) {
        return { ok: false, message: "أضف وصفاً أو رابطاً يوضح إنجاز المهمة." };
      }
      if (
        input.evidenceUrl.trim() &&
        !isValidExternalUrl(input.evidenceUrl.trim())
      ) {
        return { ok: false, message: "رابط الإثبات يجب أن يبدأ بـ https://." };
      }

      const submission: DemoSubmission = {
        id: makeId(),
        taskId: task.id,
        userId,
        evidenceText: input.evidenceText.trim(),
        evidenceUrl: input.evidenceUrl.trim() || null,
        rewardBaseIqdSnapshot: task.rewardBaseIqd,
        rewardMultiplierSnapshot: getDemoVerifiedSubscriptionMultiplier(userId),
        status: "pending",
        submittedAt: new Date().toISOString(),
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null,
        rewardIqd: null,
      };
      commit((current) => ({
        ...current,
        submissions: [submission, ...current.submissions],
      }));
      return { ok: true };
    },
    [commit, demoMode, state.submissions, state.tasks, userId],
  );

  const reviewSubmission = useCallback(
    (
      submissionId: string,
      decision: "approved" | "rejected",
      reason: string,
    ) => {
      if (!demoMode)
        return {
          ok: false,
          message: "الخدمات الخلفية غير متصلة بعد. لم يتم تسجيل قرار المراجعة.",
        };
      const submission = state.submissions.find(
        (candidate) => candidate.id === submissionId,
      );
      if (!submission || submission.status !== "pending") {
        return { ok: false, message: "تم تحديث هذه المشاركة أو لم تعد متاحة." };
      }
      const task = state.tasks.find(
        (candidate) => candidate.id === submission.taskId,
      );
      if (!task)
        return { ok: false, message: "تعذّر العثور على المهمة المرتبطة." };
      if (submission.userId === userId || task.createdBy === userId) {
        return { ok: false, message: "لا يمكنك مراجعة مشاركتك أو مهمتك." };
      }
      if (decision === "rejected" && !reason.trim()) {
        return { ok: false, message: "اكتب سبب الرفض ليظهر لصاحب المشاركة." };
      }

      const reviewedAt = new Date();
      if (decision === "approved") {
        const eligibility = getApprovalEligibility(
          state.submissions,
          submission.userId,
          reviewedAt.getTime(),
        );
        if (!eligibility.eligible) {
          return {
            ok: false,
            message: "تتعذر الموافقة قبل انتهاء فترة 24 ساعة من آخر موافقة.",
          };
        }
      }

      let rewardIqd: number | null = null;
      try {
        // This demo has no verified package data; the worker multiplier is 1.
        if (decision === "approved") {
          rewardIqd = calculateRewardIqd(
            submission.rewardBaseIqdSnapshot,
            submission.rewardMultiplierSnapshot,
          );
        }
      } catch (error) {
        return {
          ok: false,
          message:
            error instanceof Error ? error.message : "تعذّر حساب المكافأة.",
        };
      }

      commit((current) => ({
        ...current,
        submissions: current.submissions.map((candidate) =>
          candidate.id === submission.id
            ? {
                ...candidate,
                status: decision,
                reviewedAt: reviewedAt.toISOString(),
                reviewedBy: userId,
                rejectionReason: decision === "rejected" ? reason.trim() : null,
                rewardIqd,
              }
            : candidate,
        ),
      }));
      return { ok: true };
    },
    [commit, demoMode, state.submissions, state.tasks, userId],
  );

  const setTaskActive = useCallback(
    (taskId: string, active: boolean) => {
      if (!demoMode) return;
      commit((current) => ({
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === taskId
            ? { ...task, active, updatedAt: new Date().toISOString() }
            : task,
        ),
      }));
    },
    [commit, demoMode],
  );

  const value = useMemo(
    () => ({
      userId,
      canManageTasks,
      canReviewTasks,
      demoMode,
      ready,
      state,
      storageAvailable,
      createTask,
      updateTask,
      submitEvidence,
      reviewSubmission,
      setTaskActive,
    }),
    [
      userId,
      canManageTasks,
      canReviewTasks,
      demoMode,
      ready,
      state,
      storageAvailable,
      createTask,
      updateTask,
      submitEvidence,
      reviewSubmission,
      setTaskActive,
    ],
  );

  return <MvpContext.Provider value={value}>{children}</MvpContext.Provider>;
}

export function useMvp() {
  const context = useContext(MvpContext);
  if (!context) throw new Error("useMvp must be used inside MvpProvider.");
  return context;
}

export const initialTaskFormValues: CreateTaskInput = {
  title: "",
  summary: "",
  description: "",
  externalUrl: "",
  instructions: "",
  rewardBaseIqd: BASE_TASK_REWARD_IQD,
  evidenceRequired: true,
  active: true,
};
