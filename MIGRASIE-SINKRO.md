# Doenit na @tertius4/sinkro-db (fase 6)

Hierdie lêer is die opdrag vir Claude Code. Dit staan in die wortel van die Doenit-repo. Stap 1 (inventaris) is
klaar: `docs/sinkro-inventaris.md`. Hierdie weergawe verwerk Tertius se besluite oor afdeling 10 daarvan.

## Reëls (lees dit eerste)

- Werk net op die tak `sinko-db-migrasie`. Moenie commit of push nie: Tertius doen dit self.
- Moet nooit `.env*` of `functions/service-account-key.json` lees, oopmaak of na hulle verwys nie.
- Moet nooit na produksie-Firestore skryf, reëls of funksies ontplooi (`firebase deploy`) of die app vrystel nie.
  Alles wat data raak, loop eers teen die Firestore-emulator.
- Hou die kode netjies en leesbaar. Nooit twee of meer ternaries in een reël nie. Vermy `$effect()` waar dit sin maak.
- Stop en vra by elke punt hieronder wat met **Vra vir Tertius** gemerk is.
- Antwoord in Afrikaans.

## Agtergrond

Doenit is 'n Svelte 5 + Capacitor-taaklys-app met RxDB as plaaslike databasis en 'n eie sinkronisasie-enjin in
`src/lib/domain/sync/`. Die kern daarvan is uitgehaal na `@tertius4/sinkro-db` (GitHub Packages, repo
`tertius4/sinkro-db`, langsaan in `../sinkro-db`). Lees die pakket se `README.md` en `docs/api.md` voor stap 2.

**Fase 6 het sinkro-db 0.2.0 nodig** (`moveChannel`, `import`, `forgetChannel`, `@tertius4/sinkro-db/server`). As
0.2.0 nog nie op GitHub Packages is nie, gebruik tydelik `"@tertius4/sinkro-db": "file:../sinkro-db"`.

## Besluite (afdeling 10 van die inventaris)

- **Verpligte opgradering, met 'n weergawe-hek wat nog gebou moet word (B9).** Doenit het nog geen `latest` nie. 'n
  Hek werk net vir weergawes wat dit reeds het, so die hek kom eers uit in 'n eie vrystelling (stap 0), voor die
  migrasie. Ou apps sonder die hek hou net op sinkroniseer; hulle verloor niks plaaslik nie.
- **Net `task`, `category`, `group` en `member` is `synced` (B4).** `contact`, `contact_invite` en `notification`
  word `local`-tabelle en hou hul eie sinkro-kode, want hulle pas nie in `scopes` nie. Gebruiksdata kom later as
  `push-only`.
- **Kanale (B1, B2):**
  - Persoonlike data: kanaal `personal_{uid}`, ook wanneer Sync af is. Sync af haal die kanaal net uit die
    `channels`-lys; die data bly op die toestel.
  - Voor inteken: kanaal `local`, wat nooit in die lys is nie. By inteken: `moveChannel(id, "personal_{uid}")` vir
    elke dokument.
  - Taak-na-groep en terug: `moveChannel`. Die stempels bly behou.
  - Uit 'n groep verwyder: `db.sync.forgetChannel("<scope>")`, met `onChannelRemoved` vir ongestuurde veranderinge.
  - Uitteken: `forgetChannel` vir elke kanaal (of `db.destroy()`), soos Doenit nou besluit.
  - `setChannels` vee in 0.2 niks meer uit nie, so 'n leë lys by opstart is veilig.
- **Funksies (B6):** die API en `delete-account` skryf in die nuwe formaat met `serverInsert`, `serverUpdate` en
  `serverRemove` uit `@tertius4/sinkro-db/server`, in 'n transaksie met `_v + 1` en `synced_at`. Hulle word saam
  met die reëls ontplooi.
- **Tak (B12):** `sinko-db-migrasie`.
- **Firestore-uitleg bly** `scopes/{scope}/items/{id}`; id's is uniek binne 'n scope.
- **`field_times` gaan uiteindelik weg**, saam met RxDB en `src/lib/domain/sync/`. Die omskakelskrip laat dit eers
  staan vir terugrol.

Die ander besluite in afdeling 10: volg die inventaris se aanbevelings, tensy hulle met hierdie lys bots.

## Die pakket se dataformaat in Firestore

'n Gesinkroniseerde dokument bevat die app se velde plus `id`, `channel`, `deleted`, `created_at`, `updated_at`,
`hlc`, `field_hlc` (`{ veld: stempel }`, ook vir `channel` en `deleted`) en `_sets` vir stel-velde
(`{ veld: { [JSON.stringify(waarde)]: { value, added: [stempel], removed: [] } } }`). Die adapter voeg die tabelveld,
`synced_at` en `_v` by. 'n Dokument wat na 'n ander kanaal geskuif het, laat 'n skuifrekord agter met
`_moved: "<nuwe kanaal>"` en `deleted: true`.

'n Stempel is `<ms, 13 syfers>-<teller, 4 syfers>-<toestel>`, bv. `1793254313178-0000-legacy`. Gebruik `formatHlc`
uit `@tertius4/sinkro-db/server`.

```ts
firestoreBackend({
  firestore,
  layout: {
    docs: (channel) => `scopes/${channel}/items`,
    docId: (_table, id) => id,
    time: () => "sinkro_time",
    fields: { table: "<Doenit se tabelveld>", syncedAt: "synced_at", version: "_v" },
  },
});
```

Reëls skryf ons self (`firestoreRules()` ken net die standaard-uitleg), met: lees en skryf volgens lidmaatskap,
`synced_at == request.time`, `channel` gelyk aan die scope, `_v == resource.data.get('_v', 0) + 1`, geen uitvee van
gesinkroniseerde dokumente nie, en **'n reël vir die klok-versameling** (`sinkro_time/{clientId}`: lees en skryf vir
ingetekende gebruikers, net die veld `t`, `t == request.time`). Sonder die klok-reël misluk elke sinkronisasie.

## Stappe

### 0. Weergawe-hek (eie vrystelling, voor alles anders)

'n Klein dokument in Firestore (bv. `config/app` met `min_version`) wat die app by opstart lees. Onder die minimum
weier die app om te sinkroniseer en vra die gebruiker om op te gradeer. Hierdie vrystelling bevat niks anders nie.
**Vra vir Tertius** waar die dokument moet leef en hoe die boodskap moet lyk.

### 1. Inventaris: klaar

### 2. Pakket installeer

`.npmrc` met `@tertius4:registry=https://npm.pkg.github.com` en `//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}`
(die token kom nooit in die repo nie), dan `npm install @tertius4/sinkro-db@0.2.0 dexie`.

### 3. Tabelle, toegang en databasis

- `src/lib/domain/tables.ts`: `defineTable` vir `task`, `category`, `group`, `member` (`synced`) en die `local`-tabelle.
- Gereserveerde name: `version` en `device_id` kry nuwe name (bv. `app_version`, `source_device`); die
  omskakelskrip en stap 6 hernoem hulle. `created_at` en `updated_at` kan net deur `import` gestel word.
- Velde wat in navrae met `null` vergelyk word (soos die toegewysde gebruiker): `nullable().default(null)`, en die
  skrip vul `null` in waar die veld ontbreek. Dan werk `$in: [null, x]` weer.
- `src/lib/domain/access.ts`: `defineAccess` wat die reëls beskryf, vir dokumentasie en toetse met `canAccess`.
- `src/lib/domain/db.ts`: `createSinkroDB({ storage: dexieStorage(), backend: firestoreBackend(...), channels,
  onPushRejected, onChannelRemoved, context })`. `channels` is 'n Svelte-store: `personal_{uid}` as Sync aan is,
  plus die groepe waarin die gebruiker lid is.

### 4. Navrae en UI

RxDB `selector` word `where`; `$regex` en dies meer gaan na `filter`. Lewende navrae met `liveQuery` uit
`@tertius4/sinkro-db/svelte`. Verwyder RxDB en `src/lib/domain/sync/` wanneer niks meer daarna verwys nie.

### 5. Omskakelskrip (net teen die emulator)

`scripts/migreer-na-sinkro.ts` met die Admin SDK, `--dry-run` as verstek, veilig om twee keer te loop. Vir elke
dokument onder `scopes/*/items` wat nog nie `field_hlc` het nie:

- `field_hlc[veld]` uit `field_times[veld]` met `formatHlc({ ms, counter: 0, deviceId: "legacy" })`. Velde sonder
  `field_times` (soos `member`, API-take en ou grafstene) kry 'n stempel uit `updated_at`, of anders `created_at`.
- `deleted` en `field_hlc.deleted` altyd stel, ook vir grafstene, sodat uitgeveede take nie terugkom nie.
- `channel` en `field_hlc.channel` = die scope-id.
- Elke stel-veld se skikking word `_sets[veld]`, met die veld se stempel in `added`.
- Gereserveerde velde hernoem; ontbrekende `null`-velde invul.
- `hlc` = die grootste stempel, `_v: 1`, `synced_at: serverTimestamp()`. `field_times` bly staan.
- 'n Opsomming per tabel, plus 'n lys dokumente wat die skrip nie kon omskakel nie.

Toets teen 'n kopie van die data in die emulator (Tertius doen die uitvoer self), dan die nuwe app daarteen.
**Vra vir Tertius** voor die skrip ooit teen iets anders as die emulator loop.

### 6. Eerste begin van die nuwe app

Lees die ou RxDB-databasis en bring alles in met `table.import(docs)`, met `field_hlc` uit `field_times`, sodat
die stempels behou bly. Dit dek take van gebruikers sonder Sync, instellings, gebruikers en kontakname. Dokumente wat
die bediener reeds het, kry `{ pending: false }`; ongestuurde veranderinge nie. Vee die ou RxDB-databasis eers uit ná
'n suksesvolle import (en, vir Sync-gebruikers, die eerste sinkronisasie).

### 7. Cloud Functions

Die API en `delete-account` skryf met `serverInsert`, `serverUpdate` en `serverRemove`, in 'n transaksie wat die
huidige dokument lees en `_v + 1` en `synced_at` byvoeg (voorbeeld in `docs/api.md` van die pakket). Toets teen die
emulator. Ontplooi saam met die reëls (stap 9).

### 8. Toetse

Bestaande toetse moet slaag; toetse vir die tabelle, navrae, kanaal-skuiwe, die import en die funksies. Reëls en
skrip teen die emulator met `@firebase/rules-unit-testing` (soos in `../sinkro-db/test/firestore/`). Tertius toets
self op Android en iOS: aflyn, aanlyn, Sync aan en af, inteken, twee toestelle, 'n gedeelde lys.

### 9. Uitrol (net Tertius)

Skryf net 'n kontrolelys in `docs/sinkro-uitrol.md`: hek-vrystelling (stap 0) en wag; minimum weergawe verhoog;
produksie uitvoer as rugsteun; skrip; reëls en funksies ontplooi; app vrystel; later `field_times` verwyder.

## Wanneer klaar

- Geen RxDB of `src/lib/domain/sync/` meer nie.
- Doenit se toetse en typecheck slaag.
- `docs/sinkro-inventaris.md` en `docs/sinkro-uitrol.md` bestaan.
