import { MvpGate } from "@/components/mvp/mvp-gate";
import { PackagesPage } from "@/components/mvp/account-pages";

export const dynamic = "force-dynamic";
export const metadata = { title: "الباقات | شغلني" };

export default function PackagesRoute() {
  return (
    <MvpGate>
      <PackagesPage />
    </MvpGate>
  );
}
