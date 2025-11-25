export class DateUtil {
  static format(date: Date, format: string) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return "";
    }

    const tokens: Record<string, string> = {
      YY: String(date.getFullYear()).slice(-2),
      YYYY: date.getFullYear().toString(),
      M: "" + (date.getMonth() + 1),
      MM: String(date.getMonth() + 1).padStart(2, "0"),
      MMM: date.toLocaleDateString("en", { month: "short" }),
      MMMM: date.toLocaleDateString("en", { month: "long" }),
      D: "" + date.getDate(),
      DD: String(date.getDate()).padStart(2, "0"),
      ddd: date.toLocaleDateString("en", { weekday: "short" }),
      dddd: date.toLocaleDateString("en", { weekday: "long" }),
      H: "" + date.getHours(),
      HH: String(date.getHours()).padStart(2, "0"),
      m: "" + date.getMinutes(),
      mm: String(date.getMinutes()).padStart(2, "0"),
      s: "" + date.getSeconds(),
      ss: String(date.getSeconds()).padStart(2, "0"),
    };

    return format.replace(/YYYY|YY|MMMM|MMM|MM|M|dddd|ddd|DD|D|HH|H|mm|m|ss|s/g, (match) => tokens[match]);
  }

  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  static isSameDay(date1: Date | null, date2: Date | null): boolean {
    if (!date1 || !date2) return false;
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  static isDateInRange(date: Date, start: Date, end: Date): boolean {
    if (!start || !end) return false;

    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const s = new Date(start);
    s.setHours(0, 0, 0, 0);
    const e = new Date(end);
    e.setHours(0, 0, 0, 0);
    
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
}
