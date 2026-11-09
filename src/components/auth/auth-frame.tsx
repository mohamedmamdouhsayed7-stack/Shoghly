import type { ReactNode } from "react";
import Link from "next/link";

export function AuthFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
      <section className="border-border bg-card w-full max-w-md rounded-2xl border p-6 shadow-sm sm:p-8">
        <Link
          href="/"
          className="text-primary focus-visible:ring-ring inline-flex items-center gap-2 rounded-lg text-sm font-bold focus-visible:ring-2 focus-visible:outline-none"
        >
          <span
            aria-hidden="true"
            className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-xl text-base"
          >
            ش
          </span>
          شغلني
        </Link>
        <h1 className="mt-7 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-7">
          {description}
        </p>
        <div className="mt-7">{children}</div>
      </section>
    </main>
  );
}
