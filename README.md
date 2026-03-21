# Doenit - Die eerste Afrikaanse Taaklys toepassing.

## Doelwit: 20 Junie 2026
- iOS en Android apps en payment systems.
    - Gebruiker kan subscriptions: koop/los
- Deel van take werk perfek.
    - Users kan 'n kontaklys opbou deur uitnodigings uit te stuur en aanvaar
    - Users kan groups vorm en hulle kontaks daarin sit.
    - Users kan take in die groups sit.
    - Users moet kan rolle wysig in 'n group.
    


# Kode
- Svelte 5
- Capacitor 8
- RxDB met Dexie databasis (lokaal)
- Firebase databasis (aanlyn sinkronisasie)

# Kode reëls

Perfect.
Let’s consolidate everything into one **clean, final architecture map** for your app.

This will include:

* All layers/components
* Their responsibilities
* What they are allowed to talk to
* What they must NOT talk to

This will be your architectural contract.

---

# 🏗 High-Level Architecture

```text
UI
 ↓
Context
 ↓
View        API
   ↓         ↓
        DB (Domain Persistence)
               ↓
           Table<T>
               ↓
             RxDB
               ↓
           SyncEngine ↔ Firestore

API also talks to:
Services (Billing, Backup, Widgets, Notifications, Auth)
```

Now let’s define everything clearly.

---

# 1️⃣ UI Layer (Svelte Components)

### Responsibility

* Render
* Handle user interaction
* Call API
* Read from Context

### Can talk to:

* API
* Context

### Must NOT talk to:

* DB
* RxDB
* SyncEngine
* Services
* Firestore
* View (directly)

UI is presentation only.

---

# 2️⃣ Context Layer (Reactive Projection Holder)

Example: `TasksContext`

### Responsibility

* Hold reactive UI-ready data
* Store filtered/sorted projections
* Provide lookup maps for UI convenience

### Can talk to:

* View (subscribe to it)

### Must NOT talk to:

* API
* DB (directly, ideally)
* Services
* SyncEngine

Context is read-only projection storage.

It does not mutate domain data.

---

# 3️⃣ View Layer (`View.*`)

Read-only projection builder.

Example:

```ts
View.tasks.dashboard()
View.user.profile()
```

### Responsibility

* Combine tables
* Build derived read models
* Join entities
* Aggregate counts
* Shape data for screens

### Can talk to:

* DB (read methods only)

### Must NOT talk to:

* API
* Services
* UI
* SyncEngine

View never writes.

---

# 4️⃣ API Layer (`API.*`)

Mutation + business logic authority.

Example:

```ts
API.task.create()
API.user.upgrade()
```

### Responsibility

* Validate
* Enforce business rules
* Orchestrate multi-entity changes
* Call services
* Write to DB

### Can talk to:

* DB (write + read)
* Services

### Must NOT talk to:

* UI
* Context
* RxDB directly
* Firestore directly

API is the only write authority.

---

# 5️⃣ DB Layer (`DB.*`)

Domain persistence boundary.

Example:

```ts
DB.tasks.create()
DB.tasks.mergeRemote()
DB.users.get()
```

### Responsibility

* Persist entities
* Attach metadata (updatedAt, deviceId)
* Soft delete
* Enqueue sync
* Merge remote updates

### Can talk to:

* Table<T>
* SyncEngine (through defined methods)

### Must NOT talk to:

* UI
* Context
* API (no callbacks upward)
* Services (except maybe auth initialization)

DB knows nothing about presentation or billing.

---

# 6️⃣ Table<T> Layer (Storage Adapter)

Example:

```ts
Table<Task>
```

### Responsibility

* Wrap RxDB
* Execute raw collection ops
* Convert documents to JSON

### Can talk to:

* RxDB

### Must NOT talk to:

* API
* UI
* Services
* SyncEngine
* View

It is intentionally dumb.

---

# 7️⃣ SyncEngine

Handles cloud replication.

### Responsibility

* Flush outbox
* Listen to Firestore
* Call DB.mergeRemote()
* Retry failures

### Can talk to:

* DB
* Firestore

### Must NOT talk to:

* UI
* API
* Context
* Services

SyncEngine reconciles persistence only.

---

# 8️⃣ Services Layer (Infrastructure)

Examples:

* BillingService
* BackupService
* NotificationService
* WidgetService
* AuthService

### Responsibility

* Talk to external systems
* Return results/events
* No business meaning

### Can talk to:

* External SDKs
* API (called by API)
* DB (read-only if needed)

### Must NOT:

* Contain business rules
* Update DB directly (except Auth coordinating identity scope)
* Talk to UI

API interprets service results.

---

# 9️⃣ Firestore (External Cloud Persistence)

### Responsibility

* Cloud replication
* Cross-device sync

Only SyncEngine talks to it.

---

# 🔐 Interaction Rules Summary

### Writes

Only API and SyncEngine may cause DB mutations.

### Reads

* View
* API
* Context (via View)
* Services (read-only)
* SyncEngine

### Projection

Only View builds cross-entity models.

### Business Rules

Only API enforces them.

---

# 🧠 Clean Dependency Direction

Dependencies always go downward.

```text
UI → API → DB → Table → RxDB
        ↓
      Services

Context → View → DB
SyncEngine → DB
```

Nothing points back up.

No circular dependencies.

---

# 🔥 Final Responsibility Table

| Layer      | Purpose                    | Writes | Combines  | Talks To      |
| ---------- | -------------------------- | ------ | --------- | ------------- |
| UI         | Presentation               | ❌      | ❌         | API, Context  |
| Context    | Reactive projection holder | ❌      | ❌         | View          |
| View       | Read models                | ❌      | ✅         | DB            |
| API        | Business logic             | ✅      | Sometimes | DB, Services  |
| DB         | Domain persistence         | ✅      | ❌         | Table         |
| Table      | Storage adapter            | ✅      | ❌         | RxDB          |
| SyncEngine | Cloud replication          | ✅      | ❌         | DB, Firestore |
| Services   | External adapters          | ❌      | ❌         | External SDKs |

---

# 🎯 If You Follow This

You get:

* Offline-first stability
* Clean collaboration handling
* Scalable UI architecture
* Testable services
* Replaceable storage
* Replaceable billing
* Replaceable sync

This is a production-grade architecture.

---

If you'd like next, we can:

* Stress-test this with a real complex scenario
* Or simplify it slightly if you feel it's too heavy

You’ve now reached “architecting a serious app” level.
