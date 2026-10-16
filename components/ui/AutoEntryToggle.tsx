"use client";

import { useId } from "react";
import { Zap } from "lucide-react";

/**
 * Auto Entry toggle.
 *
 * When on, this customer's daily delivery rows are created pre-marked delivered, so the
 * driver doesn't tap them every shift. The row still appears on the run sheet and can be
 * unchecked if the milk wasn't actually delivered — the driver stays the final authority,
 * this only removes the repetitive tapping.
 *
 * Styled to sit inline with `CustomSelect` in the customer forms.
 */
export default function AutoEntryToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  // Stable, collision-free id so the label is properly associated with the switch.
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[11px] font-bold uppercase tracking-widest text-mono-text-disabled"
      >
        Auto Entry
      </label>

      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-card border transition-colors active:scale-[0.98] ${
          enabled
            ? "bg-mono-text border-mono-text"
            : "bg-white border-mono-divider hover:bg-mono-surface"
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Zap size={16} className={enabled ? "text-white" : "text-mono-text-disabled"} />
          <span
            className={`text-sm font-medium truncate ${
              enabled ? "text-white" : "text-mono-text-muted"
            }`}
          >
            {enabled ? "On" : "Off"}
          </span>
        </span>

        <span
          aria-hidden="true"
          className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${
            enabled ? "bg-white/25" : "bg-mono-surface"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
              enabled ? "left-[22px] bg-white" : "left-0.5 bg-mono-text-disabled"
            }`}
          />
        </span>
      </button>

      <p className="text-[11px] leading-snug text-mono-text-disabled">
        Deliveries appear already ticked. Untick in the app if milk was not delivered.
      </p>
    </div>
  );
}
