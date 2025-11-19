import { Cached } from "./cache.svelte";

type ToastType = "success" | "error" | "info";
interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number; // ms
  position?: "top" | "bottom";
}

export class Alert {
  private static container: HTMLElement | null = null;
  private static queue: ToastOptions[] = [];
  private static showing = false;

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
    return Cached.language.value === "af" ? "Reg" : "OK";
  }

  static success(message: string, duration?: number, position?: "top" | "bottom") {
    Alert.show({ message, type: "success", duration, position });
  }

  static error(message: string, duration?: number, position?: "top" | "bottom") {
    Alert.show({ message, type: "error", duration, position });
  }

  static confirm(options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      if (!Alert.container) {
        Alert.container = document.createElement("div");
        Alert.container.className = "fixed z-50 inset-0 w-full flex flex-col items-center pointer-events-none";
        document.body.appendChild(Alert.container);
      }

      // Create backdrop
      const backdrop = document.createElement("div");
      backdrop.className = "fixed inset-0 bg-black/50 pointer-events-auto";

      // Create modal
      const modal = document.createElement("div");
      modal.className =
        "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-page rounded-lg p-6 max-w-[90%] sm:max-w-md w-full pointer-events-auto";

      // Title
      const title = document.createElement("h3");
      title.className = "text-lg font-semibold mb-2 text-strong";
      title.textContent = options.title;
      modal.appendChild(title);

      // Message
      const message = document.createElement("p");
      message.className = "text-normal mb-6";
      message.textContent = options.message;
      modal.appendChild(message);

      // Button container
      const buttonContainer = document.createElement("div");
      buttonContainer.className = "flex justify-end gap-3";

      // Cancel button
      const cancelButton = document.createElement("button");
      cancelButton.textContent = options.cancelText || (Cached.language.value === "af" ? "Kanselleer" : "Cancel");
      cancelButton.className = "px-4 py-2 bg-card text-normal rounded-lg";
      cancelButton.onclick = () => {
        backdrop.remove();
        modal.remove();
        resolve(false);
      };
      buttonContainer.appendChild(cancelButton);

      // Confirm button
      const confirmButton = document.createElement("button");
      confirmButton.textContent = options.confirmText || (Cached.language.value === "af" ? "Bevestig" : "Confirm");
      confirmButton.className = "px-4 py-2 bg-primary text-alt rounded-lg ml-auto";
      confirmButton.onclick = () => {
        backdrop.remove();
        modal.remove();
        resolve(true);
      };
      buttonContainer.appendChild(confirmButton);

      modal.appendChild(buttonContainer);

      // Add to container
      Alert.container.appendChild(backdrop);
      Alert.container.appendChild(modal);

      // Close on backdrop click
      backdrop.onclick = () => {
        backdrop.remove();
        modal.remove();
        resolve(false);
      };
    });
  }
}
