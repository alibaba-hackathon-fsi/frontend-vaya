import type {
  CliffEvent,
  GraceConfig,
  InstallmentRow,
  RatePeriod,
} from "./types";

/**
 * Detect payment cliffs (sudden monthly payment spikes) in an amortization schedule.
 * Sorted descending by deltaVnd (largest shock first).
 */
export function detectCliffs(
  schedule: InstallmentRow[],
  grace: GraceConfig,
  rateSchedule: RatePeriod[],
): CliffEvent[] {
  const events: CliffEvent[] = [];
  const promoEndMonth =
    rateSchedule.find((p) => p.kind === "PROMO")?.toMonth ?? 0;

  for (let idx = 0; idx < schedule.length - 1; idx += 1) {
    const rowBefore = schedule[idx];
    const rowAfter = schedule[idx + 1];

    const paymentBefore = rowBefore.totalPayment;
    const paymentAfter = rowAfter.totalPayment;
    const deltaVnd = paymentAfter - paymentBefore;

    if (deltaVnd > 0) {
      const multiplier =
        paymentBefore > 0
          ? Number((paymentAfter / paymentBefore).toFixed(2))
          : null;

      let severity: "MINOR" | "MAJOR" | "CLIFF" = "MINOR";
      if (paymentBefore === 0 || (multiplier !== null && multiplier >= 3.0)) {
        severity = "CLIFF";
      } else if (multiplier !== null && multiplier >= 1.3) {
        severity = "MAJOR";
      }

      const causesVi: string[] = [];
      const monthBefore = rowBefore.month;

      if (
        monthBefore === grace.developerSubsidyMonths &&
        grace.developerSubsidyMonths > 0
      ) {
        causesVi.push("Hết hỗ trợ lãi suất từ chủ đầu tư");
      }
      if (
        monthBefore === grace.principalGraceMonths &&
        grace.principalGraceMonths > 0
      ) {
        causesVi.push("Hết ân hạn nợ gốc");
      }
      if (
        monthBefore === promoEndMonth &&
        promoEndMonth > 0 &&
        promoEndMonth !== grace.developerSubsidyMonths
      ) {
        causesVi.push("Hết lãi suất ưu đãi");
      }

      if (causesVi.length > 1) {
        causesVi.push("Các sự kiện xảy ra cùng lúc");
      } else if (causesVi.length === 0) {
        causesVi.push("Tăng lãi suất định kỳ hoặc điều chỉnh kỳ hạn");
      }

      events.push({
        month: rowAfter.month,
        paymentBefore,
        paymentAfter,
        deltaVnd,
        multiplier,
        causesVi,
        severity,
      });
    }
  }

  events.sort((a, b) => b.deltaVnd - a.deltaVnd);
  return events;
}

export function getPrimaryCliff(events: CliffEvent[]): CliffEvent | null {
  return events[0] ?? null;
}
