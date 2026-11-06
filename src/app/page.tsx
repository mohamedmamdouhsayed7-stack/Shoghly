import Link from "next/link";
import { ArrowLeft, Check, ShieldCheck, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const principles = [
  {
    icon: ShieldCheck,
    title: "وضوح من البداية",
    detail: "معلومات مفهومة وتجربة مصممة لتكون سهلة الاستخدام.",
  },
  {
    icon: Check,
    title: "خطوات بسيطة",
    detail: "واجهة عربية مرتبة تساعدك على معرفة ما تحتاجه بسهولة.",
  },
  {
    icon: Sparkles,
    title: "تجربة تتطور",
    detail: "أساس مرن لتقديم تجربة يومية أفضل مع نمو المنصة.",
  },
];

export default function HomePage() {
  return (
    <>
      <a href="#main" className="skip-link">
        انتقل إلى المحتوى الرئيسي
      </a>
      <SiteHeader />
      <main id="main">
        <section id="top" className="relative isolate overflow-hidden">
          <div
            aria-hidden="true"
            className="hero-glow pointer-events-none absolute inset-0 -z-10"
          />
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:py-28">
            <div>
              <p className="border-primary/15 bg-primary/5 text-primary mb-5 inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold">
                <span
                  aria-hidden="true"
                  className="bg-primary size-2 rounded-full"
                />
                شغلني — فرصتك تبدأ بخطوة
              </p>
              <h1 className="text-foreground max-w-2xl text-4xl leading-[1.25] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                وقتك له قيمة،{" "}
                <span className="text-primary">وإنجازك يستحق.</span>
              </h1>
              <p className="text-muted-foreground mt-6 max-w-xl text-base leading-8 sm:text-lg">
                شغلني مساحة رقمية تجمع الفرص اليومية في تجربة عربية بسيطة،
                واضحة، ومصممة لتناسبك.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild>
                  <a href="#about">
                    تعرّف على شغلني{" "}
                    <ArrowLeft aria-hidden="true" className="size-4" />
                  </a>
                </Button>
                <Link
                  href="#principles"
                  className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  اكتشف مبادئنا
                </Link>
              </div>
              <div className="text-muted-foreground mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                <span className="inline-flex items-center gap-2">
                  <Check aria-hidden="true" className="text-primary size-4" />{" "}
                  تجربة عربية أولاً
                </span>
                <span className="inline-flex items-center gap-2">
                  <Check aria-hidden="true" className="text-primary size-4" />{" "}
                  مصممة للهاتف
                </span>
              </div>
            </div>

            <Card className="relative overflow-hidden border-white/70 bg-white/85 shadow-[0_24px_80px_-36px_rgba(17,74,61,0.32)] backdrop-blur">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      أهلاً بك في
                    </p>
                    <h2 className="text-foreground mt-1 text-3xl font-extrabold tracking-tight">
                      شغلني
                    </h2>
                  </div>
                  <span
                    aria-hidden="true"
                    className="bg-primary/10 text-primary grid size-12 place-items-center rounded-2xl"
                  >
                    <Sparkles className="size-6" />
                  </span>
                </div>
                <div className="bg-border my-7 h-px" />
                <p className="text-muted-foreground text-base leading-8">
                  مساحة يومية للفرص والإنجاز. نعمل على تقديم تجربة رقمية تجمع
                  البساطة والوضوح في مكان واحد.
                </p>
                <div className="bg-secondary/70 mt-7 rounded-xl p-4">
                  <p className="text-foreground text-sm font-semibold">
                    مصممة لك
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    من أول زيارة، صُممت شغلني لتكون واضحة على شاشة هاتفك.
                  </p>
                </div>
                <div className="text-muted-foreground mt-6 flex items-center gap-2 text-xs font-medium">
                  <span className="bg-primary size-2 rounded-full" />
                  <span>تجربة عربية واتجاه كتابة من اليمين إلى اليسار</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="about" className="border-border border-y bg-white/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="max-w-2xl">
              <p className="text-primary text-sm font-bold">عن شغلني</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                منصة بتجربة أقرب وأسهل
              </h2>
              <p className="text-muted-foreground mt-4 leading-8">
                نبني تجربة عربية تراعي وقتك وتضع الوضوح وسهولة الاستخدام في
                المقدمة.
              </p>
            </div>
            <div
              id="principles"
              className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {principles.map(({ icon: Icon, title, detail }) => (
                <Card key={title} className="border-border/80 shadow-none">
                  <CardContent>
                    <span className="bg-primary/10 text-primary grid size-11 place-items-center rounded-xl">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <h3 className="mt-5 text-lg font-bold">{title}</h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-7">
                      {detail}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} شغلني — SHOGHLY</p>
        <p>فرصتك تبدأ بخطوة.</p>
      </footer>
    </>
  );
}
