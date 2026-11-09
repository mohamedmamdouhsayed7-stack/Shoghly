import { MvpGate } from "@/components/mvp/mvp-gate";
import { UnavailableMoneyAction } from "@/components/mvp/account-pages";

export const dynamic = "force-dynamic";
export const metadata = { title: "الإيداع | شغلني" };

export default function DepositPage() {
  return (
    <MvpGate>
      <UnavailableMoneyAction kind="deposit" />
    </MvpGate>
  );
}
