/**
 * True if the value is a calendar day strictly after "today" (UTC calendar date).
 * Accepts YYYY-MM-DD strings or Date. Invalid / empty values return false (not treated as future).
 */
export function isCalendarDateAfterToday(value) {
    if (value == null || value === "") return false;
    const ref = new Date();
    const refDay = Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate());
    let dayMs;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        dayMs = Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
    } else {
        const s = String(value).trim().slice(0, 10);
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return false;
        dayMs = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
    return dayMs > refDay;
}
