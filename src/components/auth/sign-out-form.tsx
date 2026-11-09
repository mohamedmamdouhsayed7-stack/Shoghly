import { signOutAction } from "@/lib/auth/actions";

export function SignOutForm() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="border-border text-foreground focus-visible:ring-ring inline-flex min-h-11 w-full items-center justify-center rounded-xl border px-5 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
      >
        تسجيل الخروج
      </button>
    </form>
  );
}
