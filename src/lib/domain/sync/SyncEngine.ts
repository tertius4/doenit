import firestore from "$services/firestore";
import { PullProcessor } from "./PullProcessor";
import { PushProcessor } from "./PushProcessor";

class SyncEngine {
  private running = false;
  private scheduled = false;
  private scheduledTimer: ReturnType<typeof setTimeout> | null = null;

  startRealtimeSync(scopes: string[]): () => void {
    const since = new Date().toISOString();
    const unsubscribers = scopes.map((scope_id) =>
      firestore.subscribeItems(scope_id, since, () => this.requestTick())
    );
    return () => unsubscribers.forEach((unsub) => unsub());
  }

  requestTick() {
    if (this.scheduled) return;

    this.scheduled = true;

    this.scheduledTimer = setTimeout(() => {
      this.scheduled = false;
      this.scheduledTimer = null;
      this.tick();
    }, 100); // debounce
  }

  async flush() {
    if (this.scheduledTimer) {
      clearTimeout(this.scheduledTimer);
      this.scheduledTimer = null;
      this.scheduled = false;
    }

    await this.tick();
  }

  private async tick() {
    if (this.running) return;
    this.running = true;

    try {
      await PushProcessor.run();
      await PullProcessor.run();
    } finally {
      this.running = false;
    }
  }
}

const syncEngine = new SyncEngine();
export default syncEngine;
