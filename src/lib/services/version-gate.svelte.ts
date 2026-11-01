import { App } from "@capacitor/app";
import { wait } from "$lib";
import { isOlderVersion } from "$logic/version";
import firestore from "$services/firestore";
import { is_web } from "$services/platform";

const CHECK_TIMEOUT_MS = 5_000;

/**
 * Stops app versions below config/app's `min_version` from syncing, so a change to the Firestore format never meets an
 * old app. The web always runs the latest build. A failed check lets sync through and is tried again on the next sync:
 * the Firestore rules still refuse what an old app may no longer write.
 */
class VersionGate {
  outdated = $state(false);
  private checked = false;

  async isOutdated(): Promise<boolean> {
    if (is_web || this.checked) return this.outdated;

    try {
      const timeout = wait(CHECK_TIMEOUT_MS).then(() => {
        throw new Error("Timed out");
      });
      const min_version = await Promise.race([firestore.fetchMinVersion(), timeout]);
      const { version } = await App.getInfo();

      this.outdated = !!min_version && isOlderVersion(version, min_version);
      this.checked = true;
    } catch (error) {
      console.warn("[VersionGate] Could not check the minimum version:", error);
    }
    return this.outdated;
  }
}

const versionGate = new VersionGate();
export default versionGate;
