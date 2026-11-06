import Link from "next/link";
import { ArrowLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "#about", label: "عن شغلني" },
  { href: "#principles", label: "مبادئنا" },
];

export function SiteHeader() {
  return (
    <header className="border-border/80 bg-background/95 sticky top-0 z-20 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:h-[4.5rem]">
        <Link
          href="#top"
          className="focus-visible:ring-ring flex items-center gap-3 rounded-lg focus-visible:ring-2 focus-visible:outline-none"
          aria-label="شغلني، إلى بداية الصفحة"
        >
          <span
            aria-hidden="true"
            className="bg-primary text-primary-foreground grid size-10 place-items-center rounded-xl text-lg font-extrabold"
          >
            ش
          </span>
          <span className="leading-tight">
            <span className="block text-base font-bold tracking-tight">
              شغلني
            </span>
            <span
              className="text-muted-foreground block text-[0.68rem]"
              lang="en"
              dir="ltr"
            >
              SHOGHLY
            </span>
          </span>
        </Link>

        <nav
          aria-label="التنقل الرئيسي"
          className="hidden items-center gap-7 md:flex"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild className="hidden sm:inline-flex">
            <a href="#about">
              اكتشف شغلني <ArrowLeft aria-hidden="true" className="size-4" />
            </a>
          </Button>
          <a
            href="#navigation"
            className="border-border text-foreground focus-visible:ring-ring inline-flex size-11 items-center justify-center rounded-xl border focus-visible:ring-2 focus-visible:outline-none md:hidden"
            aria-label="انتقل إلى التنقل"
          >
            <Menu aria-hidden="true" className="size-5" />
          </a>
        </div>
      </div>
      <nav
        id="navigation"
        aria-label="التنقل للشاشات الصغيرة"
        className="border-border/70 flex gap-2 overflow-x-auto border-t px-4 py-2 md:hidden"
      >
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring shrink-0 rounded-lg px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
