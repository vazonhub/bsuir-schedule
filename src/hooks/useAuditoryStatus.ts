import { useEffect, useState } from 'react';

import { AuditoryController } from '@controllers/auditory.controller';
import { useScheduleStore } from '@stores/schedule.store';
import { computeAuditoryStatus, type AuditoryStatus } from '@utils/auditoryStatus';
import { pickAuditoryKey } from '@utils/auditory';

/**
 * Track the real-time status of the given auditory. Returns:
 * - `null` — feature disabled, unknown room, or index not loaded yet.
 * - `AuditoryStatus` — busy or free with timestamps.
 *
 * The hook:
 * 1. Lazy-loads the index on first call (fetches once per app session/day).
 * 2. Recomputes every 60 s so a "busy" chip flips to "free" when the lesson ends
 *    while the modal is still open.
 * 3. Recomputes whenever `enabled` toggles (e.g. modal opens with a new lesson).
 */
export function useAuditoryStatus(
  auditories: readonly string[] | null | undefined,
  enabled: boolean,
): AuditoryStatus | null {
  const currentWeek = useScheduleStore((s) => s.currentWeek);
  // The status is stored together with the key it was computed for: when the auditory
  // changes / the hook is disabled, it returns null without a synchronous setState in an effect.
  const [result, setResult] = useState<{ key: string; status: AuditoryStatus | null } | null>(null);

  const key = pickAuditoryKey(auditories);

  useEffect(() => {
    if (!enabled || !key || !currentWeek) return;

    let cancelled = false;

    const recompute = () => {
      const idx = AuditoryController.peek();
      const next = computeAuditoryStatus(idx, key, new Date(), currentWeek);
      if (!cancelled) setResult({ key, status: next });
    };

    // Kick off (or reuse) the index fetch, then compute.
    void AuditoryController.getIndex().then(() => {
      if (!cancelled) recompute();
    });

    // Tick every minute — cheap, uses in-memory index only.
    const interval = setInterval(recompute, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [key, enabled, currentWeek]);

  if (!enabled || !key || !currentWeek) return null;
  return result?.key === key ? result.status : null;
}
