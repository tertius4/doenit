import { getApp, initializeApp, type Unsubscribe } from "$lib/chunk/firebase-app";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  or,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
  type WhereFilterOp,
} from "$lib/chunk/firebase-firestore";
import { APP_NAME, FIREBASE_CONFIG } from "$lib";
import DateUtil from "$lib/DateUtil";

interface QueryOptions {
  filters?: (
    | { field: string; operator: WhereFilterOp; value: any }
    | { or: { field: string; operator: WhereFilterOp; value: any }[] }
  )[];
  sort?: { field: string; direction: "asc" | "desc" }[];
  limit?: number;
}

type SnapshotCallback<T> = (docs: T[]) => void;

export class Table<T extends BackupManifest | User | OnlineTask | OnlineRoom | Invite> {
  private readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  async create(data: Omit<T, "id" | "archived" | "created_at">): Promise<SimpleResult> {
    try {
      if (!data) throw new Error("Data is required");

      const created_at = DateUtil.format(new Date(), "YYYY-MM-DD HH:mm:ss");
      const db = this.getFirestore();
      const colRef = collection(db, this.name);

      // Convert to plain object and ensure all values are serializable
      const doc_data = JSON.parse(JSON.stringify({ ...data, created_at }));
      await addDoc(colRef, doc_data);

      return { success: true };
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      console.error(`Error creating document in ${this.name}: ${error_message}`);
      return {
        success: false,
        error_message: error_message || "Failed to create document",
      };
    }
  }

  async read(id: string): Promise<T | null> {
    const db = this.getFirestore();
    const docRef = doc(db, this.name, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;

    return { id: snapshot.id, ...snapshot.data() } as T;
  }

  async readMany(options?: QueryOptions): Promise<T[]> {
    const q = this.buildQuery(options);
    const snapshot = await getDocs(q);

    return snapshot.docs.map((d) => ({ ...d.data(), id: d.id })) as T[];
  }

  async getAll(options?: QueryOptions): Promise<T[]> {
    try {
      const q = this.buildQuery(options);
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ ...d.data(), id: d.id })) as T[];
    } catch (e) {
      alert(`Failed to fetch documents from ${this.name}: ${(e as Error).stack || "Unknown error occurred"}`);
      return [];
    }
  }

  async updateById(id: string, data: Partial<T>): Promise<SimpleResult> {
    try {
      const db = this.getFirestore();
      const docRef = doc(db, this.name, id);

      await updateDoc(docRef, data);
      return { success: true };
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      return { success: false, error_message };
    }
  }

  async update(id: string, data: Partial<T>): Promise<SimpleResult> {
    try {
      const db = this.getFirestore();

      // Query for the document with matching id property
      const q = query(collection(db, this.name), where("id", "==", id), limit(1));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return { success: false, error_message: "Document not found" };
      }

      // Update using the found document reference
      await updateDoc(snapshot.docs[0].ref, data);
      return { success: true };
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      return { success: false, error_message };
    }
  }

  async delete(id: string) {
    const db = this.getFirestore();
    const docRef = doc(db, this.name, id);
    await deleteDoc(docRef);
  }

  async deleteMany(options?: QueryOptions) {
    const db = this.getFirestore();
    const batch = writeBatch(db);
    const q = this.buildQuery(options);
    const snapshot = await getDocs(q);

    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  protected getDoc(id: string) {
    const db = this.getFirestore();
    return doc(db, this.name, id);
  }

  private buildQuery(options?: QueryOptions) {
    const db = this.getFirestore();
    let colRef = collection(db, this.name);
    let q = query(colRef);

    if (options?.filters) {
      for (const f of options.filters) {
        if ("or" in f) {
          // Handle OR condition
          const orConditions = f.or.map((condition) => where(condition.field, condition.operator, condition.value));
          q = query(q, or(...orConditions));
        } else {
          // Handle regular filter
          q = query(q, where(f.field, f.operator, f.value));
        }
      }
    }

    if (options?.sort) {
      for (const s of options.sort) {
        q = query(q, orderBy(s.field, s.direction));
      }
    }

    if (options?.limit) {
      q = query(q, limit(options.limit));
    }

    return q;
  }

  subscribe(callback: SnapshotCallback<T>, options?: QueryOptions): Unsubscribe | null {
    try {
      const q = this.buildQuery(options);

      return onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs.map((d) => ({ ...d.data(), id: d.id })) as T[];
          callback(docs);
        },
        (error) => {
          console.error("Firestore subscription error for", this.name, ":");
          console.error("Error code:", error.code);
          console.error("Error message:", error.message);
          console.error("Full error:", error);

          // Handle specific error cases
          if (error.code === "permission-denied") {
            console.error("Permission denied - check Firestore security rules and authentication");
          } else if (error.code === "unauthenticated") {
            console.error("User not authenticated - make sure to sign in before accessing Firestore");
          }
        }
      );
    } catch (error) {
      alert("Error setting up subscription for " + this.name + ": " + error);
      return null;
    }
  }

  private getFirestore() {
    let app;

    try {
      app = getApp(APP_NAME);
    } catch {
      app = initializeApp(FIREBASE_CONFIG, APP_NAME);
    }

    return getFirestore(app, "doenitdb");
  }
}
