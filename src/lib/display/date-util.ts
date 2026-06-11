export default class DateUtil {
  static format(_date: any, format: string, options: { locale?: string } = {}): string {
    const date = DateUtil.toDate(_date);
    if (!date) return "";

    const locale = options?.locale || "af-ZA";
    const tokens: Record<string, string> = {
      YY: String(date.getFullYear()).slice(-2),
      YYYY: date.getFullYear().toString(),
      M: "" + (date.getMonth() + 1),
      MM: String(date.getMonth() + 1).padStart(2, "0"),
      MMM: date.toLocaleDateString(locale, { month: "short" }),
      MMMM: date.toLocaleDateString(locale, { month: "long" }),
      D: "" + date.getDate(),
      DD: String(date.getDate()).padStart(2, "0"),
      ddd: date.toLocaleDateString(locale, { weekday: "short" }),
      dddd: date.toLocaleDateString(locale, { weekday: "long" }),
      H: "" + date.getHours(),
      HH: String(date.getHours()).padStart(2, "0"),
      m: "" + date.getMinutes(),
      mm: String(date.getMinutes()).padStart(2, "0"),
      s: "" + date.getSeconds(),
      ss: String(date.getSeconds()).padStart(2, "0"),
    };

    return format.replace(/YYYY|YY|MMMM|MMM|MM|M|dddd|ddd|DD|D|HH|H|mm|m|ss|s/g, (match) => tokens[match]);
  }

  static isSameDay(date1: Date | null, date2: Date | null): boolean {
    if (!date1 || !date2) return false;
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  static isDateInRange(date: Date, start: Date | null, end: Date | null): boolean {
    if (!start || !end) return false;

    const d = new Date(date);
    const s = new Date(start);
    s.setHours(0, 0, 0, 0);
    const e = new Date(end);
    e.setHours(23, 59, 59, 999);

    return d >= s && d <= e;
  }

  /**
   * Returns a Date object representing the start or end of the day based on the provided date string.
   * @param {string | null} date Date in the format "YYYY-MM-DD HH:mm"
   * @param {'end' | 'start'} type
   * @return {Date | null} Returns a Date object representing the start or end of the day.
   */
  static parseWithTimeBoundary(date: string | null, type: "end" | "start" = "start"): Date | null {
    if (!date) return null;

    const [day, time] = date.split(" ");

    return new Date(`${day} ${time || type === "start" ? "00:00" : "23:59"}`);
  }

  static add(
    _date: any,
    { days = 0, months = 0, years = 0, hours = 0, minutes = 0, seconds = 0, milliseconds = 0 },
  ): Date | null {
    const date = DateUtil.toDate(_date);
    if (!date) return null;

    date.setDate(date.getDate() + days);
    date.setMonth(date.getMonth() + months);
    date.setFullYear(date.getFullYear() + years);
    date.setHours(date.getHours() + hours);
    date.setMinutes(date.getMinutes() + minutes);
    date.setSeconds(date.getSeconds() + seconds);
    date.setMilliseconds(date.getMilliseconds() + milliseconds);

    return date;
  }

  /**
   * Converts a string or number to a Date object. Returns null if the input is invalid.
   */
  static toDate(input: any): Date | null {
    if (isValidDate(input)) {
      return new Date(input);
    }
    if (typeof input === "string" || typeof input === "number") {
      const date = new Date(input);
      if (isValidDate(date)) return date;
    }

    return null;
  }

  static startOfDay(_date: any): Date | null {
    const date = DateUtil.toDate(_date);
    if (!date) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  }

  static endOfDay(_date: any): Date | null {
    const date = DateUtil.toDate(_date);
    if (!date) return null;
    date.setHours(23, 59, 59, 999);
    return date;
  }
}

function isValidDate(date: any): date is Date {
  return date instanceof Date && !isNaN(date.valueOf());
}
