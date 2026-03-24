import { mount, unmount } from "svelte";
import ToastContainer from "./ToastContainer.svelte";

type ToastType = "success" | "error" | "info" | "warning";

type Toast = {
  id: string;
  title?: string;
  body: string;
  duration?: number;
  type: ToastType;
};

class ToastClass {
  private instance: {} | null = null;
  private target: HTMLElement | null = null;
  toasts = $state<Toast[]>([]);

  private ensureContainer() {
    if (this.instance) return;

    this.target = document.createElement("div");
    document.body.appendChild(this.target);

    this.instance = mount(ToastContainer, {
      target: this.target,
    });
  }

  private create(input: { title?: string; body: string; duration?: number; type?: ToastType }): Toast {
    return {
      id: crypto.randomUUID(),
      title: input.title,
      body: input.body,
      duration: input.duration,
      type: input.type ?? "info",
    };
  }

  private normalize(a: string, b?: string, type?: ToastType): Toast {
    if (!!b) {
      return this.create({ title: a, body: b, type });
    } else {
      return this.create({ body: a, type });
    }
  }

  private push(t: Toast) {
    this.ensureContainer();
    this.toasts = [t, ...this.toasts];
  }

  async remove(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    if (!this.toasts.length && this.instance) {
      await unmount(this.instance);
      setTimeout(() => {
        if (this.target) {
          this.target.remove();
          this.target = null;
        }
      }, 300);

      this.instance = null;
    }
  }

  success = (a: string, b?: string) => this.push(this.normalize(a, b, "success"));
  error = (a: string, b?: string) => this.push(this.normalize(a, b, "error"));
  info = (a: string, b?: string) => this.push(this.normalize(a, b, "info"));
  warning = (a: string, b?: string) => this.push(this.normalize(a, b, "warning"));
  show = (input: { title?: string; body: string; duration?: number; type?: ToastType }) =>
    this.push(this.create(input));
}

const toast = new ToastClass();
export default toast;
