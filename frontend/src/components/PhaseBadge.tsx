import type { Phase } from "../lib/types";
import { PHASE_LABELS, PHASE_COLORS } from "../lib/constants";

export default function PhaseBadge({ phase }: { phase: Phase }) {
  const colors = PHASE_COLORS[phase];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {PHASE_LABELS[phase]}
    </span>
  );
}
