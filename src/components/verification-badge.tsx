import { BadgeCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getVerificationPresentation } from "@/lib/verification";

export function VerificationBadge({
  status,
  companyType = "direct_employer",
  verificationVersion = 0,
}: {
  status: string;
  companyType?: string;
  verificationVersion?: number;
}) {
  const { label, tone, stage } = getVerificationPresentation(
    status,
    companyType,
    verificationVersion,
  );
  const Icon =
    stage === "full" ? BadgeCheck : stage === "suspended" ? ShieldAlert : ShieldQuestion;
  return (
    <Badge tone={tone}>
      <Icon size={12} strokeWidth={2} />
      {label}
    </Badge>
  );
}
