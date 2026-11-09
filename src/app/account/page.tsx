import { AccountOverview } from "@/components/mvp/account-pages";
import { MvpGate } from "@/components/mvp/mvp-gate";

export const dynamic = "force-dynamic";
export const metadata = { title: "الحساب | شغلني" };

export default function AccountPage() {
  return (
    <MvpGate>
      <AccountOverview />
    </MvpGate>
  );
}
