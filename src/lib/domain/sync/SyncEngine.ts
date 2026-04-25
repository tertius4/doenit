import { PullProcessor } from "./PullProcessor";
import { PushProcessor } from "./PushProcessor";

class SyncEngine {
  private running = false;
  private scheduled = false;

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
