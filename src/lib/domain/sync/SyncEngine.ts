import firestore from "$services/firestore";
import { PullProcessor } from "./PullProcessor";
import { PushProcessor } from "./PushProcessor";

class SyncEngine {
  private running = false;
  private scheduled = false;

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

    setTimeout(() => {
      this.scheduled = false;
      this.tick();
    }, 100); // debounce
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
