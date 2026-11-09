import { MvpGate } from "@/components/mvp/mvp-gate";
import { UnavailableMoneyAction } from "@/components/mvp/account-pages";

export const dynamic = "force-dynamic";
export const metadata = { title: "سحب الرصيد | شغلني" };

export default function WithdrawalPage() {
  return (
    <MvpGate>
      <UnavailableMoneyAction kind="withdrawal" />
    </MvpGate>
  );
}
