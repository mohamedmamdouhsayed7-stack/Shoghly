"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound, House, Package, Plus, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DemoRoleSwitcher } from "@/components/mvp/demo-role-switcher";
import type { DemoAccountKey } from "@/lib/mvp/demo-mode-policy";

const navigation = [
  { href: "/dashboard", label: "الرئيسية", icon: House },
  { href: "/account/balance", label: "سحب الرصيد", icon: Wallet },
  { href: "/deposit", label: "إيداع", icon: Plus },
  { href: "/packages", label: "الباقات", icon: Package },
  { href: "/account", label: "الحساب", icon: CircleUserRound },
];

export function WorkspaceShell({
  children,
  showAdminLink = false,
  demoAccount,
}: {
  children: ReactNode;
  showAdminLink?: boolean;
  demoAccount?: DemoAccountKey;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-24 text-slate-900 md:pb-8">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
            aria-label="شغلني، الصفحة الرئيسية"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-lg font-black text-white">
              ش
            </span>
            <span>
              <span className="block text-base font-extrabold">شغلني</span>
              <span
                className="block text-[10px] font-semibold tracking-[0.18em] text-slate-400"
                dir="ltr"
              >
                SHOGHLY
              </span>
            </span>
          </Link>

          <nav
            aria-label="روابط المنصة"
            className="hidden items-center gap-2 md:flex"
          >
            <Link
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
              href="/tasks"
            >
              المهام
            </Link>
            <Link
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
              href="/submissions"
            >
              مشاركاتي
            </Link>
            {showAdminLink && !isAdmin ? (
              <Link
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:outline-none"
                href="/admin"
              >
                لوحة التحكم
              </Link>
            ) : null}
            {isAdmin ? (
              <Link
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
                href="/dashboard"
              >
                مساحة العامل
              </Link>
            ) : null}
          </nav>
          <Link
            href={demoAccount ? "/account" : "/profile"}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
          >
            <CircleUserRound aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">
              {demoAccount ? "حساب DEMO" : "الملف الشخصي"}
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-9">
        {demoAccount ? (
          <DemoRoleSwitcher account={demoAccount} />
        ) : (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            <span
              aria-hidden="true"
              className="mt-1 size-2 shrink-0 rounded-full bg-amber-500"
            />
            <p>
              واجهة العرض محفوظة كما هي، لكن الخدمات الخلفية غير متصلة في هذه
              البيئة. لن تُسجّل المهام أو المشاركات أو قرارات المراجعة، ولن
              تُحفظ مكافآت هنا.
            </p>
          </div>
        )}
        {children}
      </main>

      <nav
        aria-label="التنقل السفلي"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgba(15,23,42,0.06)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href === "/account" && pathname.startsWith("/account/"));
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[4.25rem] flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none focus-visible:ring-inset",
                    active
                      ? "text-rose-600"
                      : "text-slate-400 hover:text-slate-700",
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-5"
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
