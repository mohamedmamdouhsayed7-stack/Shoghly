import type { ReactNode } from "react";
import { AuthStatus, ConfigurationStatus } from "@/components/auth/auth-status";
import { MvpProvider } from "@/components/mvp/mvp-provider";
import { WorkspaceShell } from "@/components/mvp/workspace-shell";
import { getAccountAccess, getPermissionAccess } from "@/lib/auth/server";
import type { Permission } from "@/lib/auth/permissions";
import {
  getLocalDemoAccount,
  isLocalDemoModeRequest,
} from "@/lib/mvp/demo-mode";
import {
  demoRoleHasPermission,
  DEMO_ACCOUNTS,
  type DemoAccountKey,
} from "@/lib/mvp/demo-mode-policy";

function NoDemoAccess() {
  return (
    <AuthStatus
      title="لا تملك صلاحية الوصول"
      description="هذه الصفحة مخصصة للمستخدمين المخولين."
      actionHref="/dashboard"
      actionLabel="العودة إلى لوحة العامل"
    />
  );
}

function DemoWorkspace({
  children,
  account,
}: {
  children: ReactNode;
  account: DemoAccountKey;
}) {
  const demoAccount = DEMO_ACCOUNTS[account];
  const canManageTasks = account === "task-admin";
  const canReviewTasks = account === "review-admin";
  return (
    <MvpProvider
      userId={demoAccount.userId}
      canManageTasks={canManageTasks}
      canReviewTasks={canReviewTasks}
      demoMode
    >
      <WorkspaceShell
        showAdminLink={canManageTasks || canReviewTasks}
        demoAccount={account}
      >
        {children}
      </WorkspaceShell>
    </MvpProvider>
  );
}

export async function MvpGate({
  children,
  permission,
  permissions,
  showAdminLink = false,
}: {
  children: ReactNode;
  permission?: Permission;
  permissions?: readonly Permission[];
  showAdminLink?: boolean;
}) {
  if (await isLocalDemoModeRequest()) {
    const account = await getLocalDemoAccount();
    const requiredPermissions = [
      ...(permission ? [permission] : []),
      ...(permissions ?? []),
    ];
    if (
      requiredPermissions.some(
        (required) => !demoRoleHasPermission(account, required),
      )
    ) {
      return <NoDemoAccess />;
    }
    return <DemoWorkspace account={account}>{children}</DemoWorkspace>;
  }

  const access = await getAccountAccess();

  if (access.kind === "unconfigured") return <ConfigurationStatus />;
  if (access.kind === "anonymous") {
    return (
      <AuthStatus
        title="تسجيل الدخول مطلوب"
        description="سجّل الدخول لمتابعة المهام ومراجعة رصيدك التجريبي."
        actionHref="/login?next=/dashboard"
      />
    );
  }
  if (access.kind === "unverified") {
    return (
      <AuthStatus
        title="تحقق من بريدك الإلكتروني"
        description="يجب تأكيد البريد الإلكتروني قبل استخدام مساحة العمل."
        actionHref="/auth/verification-pending"
      />
    );
  }
  if (access.kind === "suspended" || access.kind === "disabled") {
    return (
      <AuthStatus
        title="الحساب غير مفعّل"
        description="لا يمكن استخدام مساحة العمل بهذا الحساب حالياً."
        actionHref="/account/suspended"
      />
    );
  }
  if (access.kind !== "active") {
    return (
      <AuthStatus
        title="تعذّر التحقق من الحساب"
        description="تعذّر تحميل الصفحة بأمان. حاول مرة أخرى لاحقاً."
      />
    );
  }

  for (const required of [
    ...(permission ? [permission] : []),
    ...(permissions ?? []),
  ]) {
    const authorization = await getPermissionAccess(required);
    if (authorization.kind !== "allowed") {
      return <NoDemoAccess />;
    }
  }

  let hasAdminAccess = false;
  if (showAdminLink && !permission) {
    const adminAccess = await getPermissionAccess("task.manage.read");
    hasAdminAccess = adminAccess.kind === "allowed";
  }

  return (
    <MvpProvider
      userId={access.user.id}
      canManageTasks={hasAdminAccess || permission === "task.manage.read"}
    >
      <WorkspaceShell showAdminLink={hasAdminAccess}>{children}</WorkspaceShell>
    </MvpProvider>
  );
}
