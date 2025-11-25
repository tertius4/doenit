/**
 * @file Alert system for displaying toast notifications.
 *
 * NB: The Language settings needs to keep in sync with user setting from outside this file (default: 'af')
 */
export class Alert {
  private static container: HTMLElement | null = null;
  private static queue: ToastOptions[] = [];
  private static showing = false;
  static language: Language = "af";

  static show(options: ToastOptions) {
    if (!Alert.container) {
      Alert.container = document.createElement("div");
      Alert.container.className = "fixed z-50 inset-0 w-full flex flex-col items-center pointer-events-none";
      document.body.appendChild(Alert.container);
    }

    Alert.queue.push(options);
    if (!Alert.showing) {
      Alert.displayNext();
    }
  }

  static success(message: string, duration?: number, position?: "top" | "bottom") {
    Alert.show({ message, type: "success", duration, position });
  }

  static error(message: string, duration?: number, position?: "top" | "bottom") {
    Alert.show({ message, type: "error", duration, position });
  }

  private static displayNext() {
    if (!Alert.container) return;
    if (Alert.queue.length === 0) {
      Alert.showing = false;
      return;
    }

    Alert.showing = true;
    const opts = Alert.queue.shift()!;
    const toast = document.createElement("div");
    toast.className =
      Alert.getClass(opts.type || "info") +
      " m-2 px-4 py-2 rounded shadow-lg text-white text-center pointer-events-auto inline-block overflow-auto max-h-[40vh] max-w-[90vw]";

    // Create message span with clickable links
    const messageSpan = document.createElement("span");
    messageSpan.innerHTML = Alert.linkify(opts.message);
    toast.appendChild(messageSpan);

    // Create OK button
    const okButton = document.createElement("button");
    okButton.textContent = Alert.getOKWord();
    okButton.className = "ml-4 px-3 py-1 bg-white text-black rounded shadow pointer-events-auto";
    okButton.onclick = () => {
      toast.remove();
      Alert.displayNext();
    };
    toast.appendChild(okButton);

    // Position
    Alert.container.style.top = opts.position === "top" ? "1rem" : "";
    Alert.container.style.bottom = opts.position === "bottom" ? "1rem" : "";
    Alert.container.appendChild(toast);
  }

  private static linkify(text: string): string {
    // Regex to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline hover:opacity-80">${url}</a>`;
    });
  }

  private static getClass(type: ToastType): string {
    switch (type) {
      case "success":
        return "bg-green-600";
      case "error":
        return "bg-red-600";
      default:
        return "bg-gray-800";
    }
  }

  private static getOKWord() {
    switch (Alert.language) {
      case "en":
        return "OK";
      case "af":
      default:
        return "Reg";
    }
  }
}
