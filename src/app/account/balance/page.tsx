import { BalancePage } from "@/components/mvp/account-pages";
import { MvpGate } from "@/components/mvp/mvp-gate";

export const dynamic = "force-dynamic";
export const metadata = { title: "الرصيد والأرباح | شغلني" };

export default function BalanceRoute() {
  return (
    <MvpGate>
      <BalancePage />
    </MvpGate>
  );
}
