# Doenit

**Doenit** is the first Afrikaans task-list app: offline-first, with shared tasks, groups and an Android home-screen widget. The app is available in Afrikaans and English.

Doenit is die eerste Afrikaanse taaklys-toepassing. Dit werk sonder internet en sinkroniseer wanneer jy weer aanlyn is.

## Kenmerke

- Take met kategorieë, sperdatums en herhaling
- Kontaklys: stuur en aanvaar uitnodigings aan ander gebruikers
- Groepe met jou mense om take te deel
- Android-widget wat take wys wat nou gedoen moet word.
- Kennisgewings, rugsteun en subscriptions
- Publieke API om take van buite die app af te skep (sien [Publieke API](#publieke-api))

## Tegnologie

| Area | Gereedskap |
| --- | --- |
| UI | Svelte 5, SvelteKit (`adapter-static`), Tailwind 4 |
| Mobiel | Capacitor 8 (Android en iOS) |
| Lokale data | RxDB |
| Wolk | Firebase: Auth, Firestore, Functions, Hosting, Messaging |

## Kom aan die gang

Vereistes: Node.js 22+ en npm.

```bash
npm i
cp .env.example .env     # vul jou Firebase-waardes in
npm run dev              # ontwikkelbediener
```

Die `.env` bevat die `PUBLIC_FIREBASE_*`-sleutels, `PUBLIC_APP_ID` en `PUBLIC_APP_NAME`. Gebruik `.env.development` en `.env.production` vir die twee omgewings.

## Bou en deploy

### Android

Vereistes: Android SDK, `adb`, `android/app/google-services.{dev,prod}.json` en 'n keystore (`tools/generate-production-keystore.sh` skep die produksie-keystore).

```bash
npm run app        # interaktiewe CLI (./tools/doenit-cli.sh)
npm run app 1      # produksie AAB + APK  -> app-output/
npm run app 2      # dev: web-bou + installeer op gekoppelde toestel
npm run app 3      # dev: installeer net die app
npm run app 4      # kyk app-logs
```

### Firebase

```bash
firebase deploy --only firestore:rules   # firestore.rules
cd functions
npm run deploy                           # produksie
npm run deploy-dev                       # dev
```

## Projekstruktuur

```text
src/lib/
  display/    UI: komponente, feature-skerms, vertalings
  logic/      API (skryf/besigheidsreëls), Context, invites, inbox
  domain/     DB, tabelle, skema en sync
  services/   Eksterne stelsels: backup, widget, notifications, auth
src/routes/   SvelteKit-bladsye
functions/    Firebase Cloud Functions (publieke API, subscriptions)
android/      Android-projek (widget, billing-plugin)
ios/          iOS-projek
docs/         Verdere dokumentasie
tools/        Bou- en deploy-skripte
```

## Argitektuur

Die kode volg 'n streng laag-struktuur. Afhanklikhede gaan altyd afwaarts:

```text
UI -> API -> DB -> Table -> RxDB
        |
        +-> Services

UI -> Context -> View -> DB
SyncEngine <-> DB, Firestore
```

| Laag | Doel | Skryf | Praat met |
| --- | --- | :-: | --- |
| UI | Vertoon en gebruikersinteraksie | nee | API, Context |
| Context | Reaktiewe data vir die UI | nee | View |
| View | Lees-modelle (joins, tellings) | nee | DB |
| API | Besigheidsreëls en alle skryfwerk | ja | DB, Services |
| DB | Persistering, metadata, sync-tou | ja | Table, SyncEngine |
| Table | Dun adapter oor RxDB | ja | RxDB |
| SyncEngine | Replikasie met Firestore | ja | DB, Firestore |
| Services | Eksterne SDK's | nee | Eksterne SDK's |

Kernreëls: net die API (en SyncEngine) verander data; net View bou modelle oor verskeie entiteite; die UI praat nooit direk met DB, RxDB, Services of Firestore nie.

Meer detail: [display](src/lib/display/README.md), [logic](src/lib/logic/README.md), [domain](src/lib/domain/README.md), [services](src/lib/services/README.md).

## Publieke API

Skep take van buite die app (skripte, Zapier, iOS Shortcuts, ...) met 'n persoonlike API-sleutel uit **Settings -> API access**.

```bash
curl -X POST https://africa-south1-doenit2.cloudfunctions.net/api/v1/tasks \
  -H "Authorization: Bearer dk_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Buy milk", "due_date": "2026-10-10", "category": "Shopping"}'
```

Hoe dit werk: die `api` Cloud Function valideer die versoek en skryf dit na `users/{uid}/inbox_tasks`. Die app luister na daardie inbox (`InboxService`), skep 'n gewone plaaslike taak met `createTask` en vee die inskrywing uit. Sleutels word deur die app geskep en slegs as SHA-256-hash in `users/{uid}/api_keys` gestoor.

Volledige verwysing: [docs/API.md](docs/API.md).