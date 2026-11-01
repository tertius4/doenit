# Sinkro-inventaris (stap 1)

Inventaris van Doenit vir die oorskakeling na `@tertius4/sinkro-db` 0.1.0, soos in `MIGRASIE-SINKRO.md`. Gelees op tak
`sinko-db-migrasie` (gelyk aan `master`, 4acd87c1) en `../sinkro-db` op `master` (0bf04b9). Niks is verander nie; net
hierdie lêer is nuut. Die produksie-data is nie gesien nie, so alles oor data kom uit die kode.

## 1. Die belangrikste bevindings

Hierdie punte verander die plan. Besonderhede is in [afdeling 8](#8-wat-nie-in-die-pakket-pas-nie) en die besluite in
[afdeling 10](#10-besluite-vir-tertius).

| # | Bevinding | Gevolg as dit nie reggestel word nie |
| - | --------- | ------------------------------------ |
| 1 | Persoonlike dokumente het `scope_id: null`, en sonder Sync of ingeteken het hulle geen scope nie. Die plan se `channel: (doc) => doc.<scope-veld>` werk dus net vir groepe. | `insert` gooi `VALIDATION` op elke persoonlike taak. |
| 2 | 'n Dokument se `channel` kan nooit verander nie, maar Doenit skuif data tussen "plaaslik", persoonlik en groep. | Inteken, Sync aan en taak-na-groep werk nie. |
| 3 | `setChannels` vee alle dokumente uit van 'n kanaal wat die lys verlaat. | Sync af of uitteken vee persoonlike take van die toestel af. 'n Leë lys by opstart vee alles uit. |
| 4 | Stap 6 sê "andersins: trek alles vars af", maar baie data bestaan net op die toestel. | Take van gebruikers sonder Sync gaan verlore, plus instellings, gebruikers en kontakname. |
| 5 | Die omskakelskrip sit nie `deleted` nie en werk nie vir dokumente sonder `field_times` nie. | Uitgevee take kom terug. `member` en ou dokumente kry geen stempels nie. |
| 6 | Die Cloud Functions skryf direk na `scopes/*/items` in die ou formaat, en hulle is nie in die plan nie. | API-veranderinge gaan stilweg verlore en `_v` word teruggestel. |
| 7 | Die pakket skryf `sinkro/~time/clients/{id}`, wat Doenit se reëls weier. | Elke sinkronisasie-lopie misluk by die kloklesing, voor push en pull. |
| 8 | `version` en `device_id` is gereserveerde veldname, ook in `local`-tabelle. | `defineTable` gooi `SCHEMA` vir `app_state`, `user` en die vier gesinkroniseerde tabelle. |
| 9 | `insert` en `update` weier `created_at`/`updated_at` en stempel hulle self. | Uitnodigings en kennisgewings verloor hul afstand-tye, en `_store`/`pull` vergelyk daarop. |
| 10 | Mango se `$in: [null, x]` vang ontbrekende velde; die pakket s'n nie. | Take sonder `assigned_firebase_uid` verdwyn van die tuisblad en uit herinneringe. |

## 2. Veldname

| Rol | Doenit se veld | Pakket | Opmerking |
| --- | -------------- | ------ | --------- |
| Tabel | `collection` | `layout.fields.table` | Word in `firestore.upsert` bygevoeg, nie plaaslik gestoor nie. |
| Scope | `scope_id` (plaaslik en in Firestore) | `channel` | `null` vir persoonlike dokumente; die pad bevat die regte scope. `channel` is 'n nuwe veld. |
| Verwyder | `soft_deleted` | `deleted` | Ander naam. Moet oorgeskakel word (bevinding 5). |
| Geskep | `created_at` (ISO-string) | `created_at` | Dieselfde naam. |
| Verander | `updated_at` (ISO-string) | `updated_at` | Dieselfde naam. |
| Bedienertyd | `synced_at` | `layout.fields.syncedAt` | Reeds so. Die reëls eis reeds `request.time`. |
| Veldtye | `field_times` (`{ veld: ISO }`) | `field_hlc` | Net op `task`, `category`, `group`. Nie op `member` nie. |
| Weergawe | `version` (app se teller) | `_v` | Twee verskillende dinge. `version` is gereserveer en val weg. |
| Toestel | `device_id` | intern | Gereserveer en val weg. |
| Eienaar | `owner_id` | nie in die pakket nie | Plaaslike gebruiker-id, verskil per toestel. Sien 8.6. |

Die layout klop dus so, plus die reël vir die klok (8.5):

```ts
fields: { table: "collection", syncedAt: "synced_at", version: "_v" }
```

Die ou enjin se metavelde wat nie saamgesmelt word nie: `id`, `created_at`, `updated_at`, `version`, `device_id`,
`owner_id`, `field_times` (`src/lib/domain/sync/field-times.ts:14`, kopie in `functions/src/api/store.ts:27`). Reël vir
'n veld sonder tyd (`field-times.ts:21`): `field_times[veld]`, anders `created_at` as `field_times` bestaan, anders
`updated_at`.

## 3. Tabelle

Alle tipes kom uit `src/lib/domain/schema/`. "Opsioneel" beteken nie in `required` nie; `category`, `group`, `member` en
`user` het `required: []`, so enige veld kan ontbreek. Hou daarom alles `.optional()` of met `.default()`, anders faal
`update` op ou dokumente, want `applyUpdate` valideer die hele dokument.

### 3.1 Gesinkroniseer in `scopes/{scope}/items`

**`task`** (skema 2, `sync-table`, sinkroniseer per veld)

| Veld | Tipe | Voorstel |
| ---- | ---- | -------- |
| `name` | string, verpligtend | `t.string()` |
| `archived` | boolean, verpligtend | `t.boolean()` |
| `description` | string | opsioneel |
| `completed` | number | teller, lww |
| `completed_at`, `due_date`, `start_date` | string, null | nullable |
| `repeat_interval` | string | `""` beteken geen |
| `repeat_interval_number` | number | |
| `repeat_specific_days` | number[] | **lww** (besluit B5) |
| `important` | boolean | |
| `category_id` | string, null (ook `""`, `categories.ts:77`) | nullable, opsioneel |
| `assigned_firebase_uid` | string, null | nullable, opsioneel; sien 8.11 |
| `photo_ids` | string[] | **`set`** (besluit B5) |
| `owner_id` | string | sien 8.6 |
| `scope_id` | string, null | onveranderlik sodra gestel, volgens `task.js:139`; sien 8.2 |
| valt weg | `soft_deleted`, `version`, `device_id`, `field_times` | |

**`category`** (skema 1): `name`, `owner_id`, `scope_id`, plus die wegvallers. API-kategorieë leef in die taak se scope
(`functions/src/api/store.ts:54`).

**`group`** (skema 1): `name`, `description`, `owner_id` (onveranderlik), `scope_id`, plus die wegvallers. `scope_id` is
gelyk aan die groep se `id`, maar word eers by die eerste lid of taak gestel (`groups.ts:320`, `task.js:179`). Tot dan is
die groep net plaaslik. `firestore.scopeDeleted` lees `scopes/{id}/items/{id}`, so die groep se dokument-id moet die
scope bly.

**`member`** (skema 0): `firebase_uid` (onveranderlik), `role` (`admin` of `member`), `owner_id`, `scope_id`
(onveranderlik), plus `soft_deleted`, `version`, `device_id`. **Geen `field_times` nie**: tans lww op die hele dokument
(`MergeEngine.ts:35`).

Daar is tans geen stel-velde nie: skikkings wen as geheel. Die skrip moet stel-velde ontdubbel, want 'n `set`-veld weier
herhalings.

### 3.2 Gesinkroniseer buite `scopes`, met eie kode

Dié pas nie by "alle tabelle is `synced`" nie, want hulle pad, reëls en logika verskil (sien 8.8).

| Tabel | Firestore | Velde |
| ----- | --------- | ----- |
| `contact_invite` | `users/{uid}/invites/{id}`, een kopie by elke party | `id`, `relationship_id` (index), `from_firebase_uid`, `from_email`, `to_firebase_uid`, `to_email`, `status` (index; `pending`, `accepted`, `rejected`, `cancelled`), `created_at`, `updated_at`, `responded_at`, `contact_name` (net plaaslik) |
| `notification` | `users/{uid}/notifications/{id}`, ander gebruikers skep dit | `id`, `user_id`, `type` (9 waardes), `title`, `body`, `read_at`, `data` (json), `created_at`, `updated_at` |
| `contact` | Geen. Afgelei van aanvaarde uitnodigings. Net die naam sinkroniseer, in `users/{uid}/meta/contact_names` | `id`, `created_at`, `updated_at`, `owner_id`, `user_id` (index), `firebase_uid` (index), `relationship_id` (index), `name`, `avatar_url`, `email_address` |

### 3.3 Net plaaslik

Sien [afdeling 7](#7-plaaslike-data).

### 3.4 Bewaar in Firestore sonder plaaslike tabel

`user_profiles/{uid}`, `users/{uid}/meta/memberships` (`scopes`, `personal_sync_enabled_at`, `updated_at`),
`users/{uid}/meta/contact_names`, `users/{uid}/push_tokens`, `users/{uid}/api_keys`, `users/{uid}/inbox_tasks`,
`email_invites/{email}/senders/{uid}`, `email_invite_quota/{uid}`. Niks hiervan raak aan die pakket nie.

## 4. Scopes en lidmaatskap

- **Twee soorte scopes.** 'n Groep se scope is die groep se id, gelys in `meta/memberships.scopes`. Die persoonlike scope
  `personal_{uid}` is nooit gelys nie: `membershipScopes` voeg dit by as `personal_sync_enabled_at` gestel is
  (`firestore.ts:75`). `user_state.active_scopes` bewaar die uitkoms plaaslik.
- **`ScopeManager`.** Kry die uid uit `session` en `user`, en hou luisteraars op lidmaatskap, uitnodigings,
  kennisgewings en die API-inkassie. Daar is dus vier watchers; net die eerste word deur `channels` vervang.
  `getUserScopes` lees `active_scopes`.
- **`context.svelte.ts:99-115`.** By elke lidmaatskap-gebeurtenis word `active_scopes` opgedateer, dan
  `applyPersonalSync`, dan `purgeLocalScope` vir elke scope wat weg is.
- **`purgeLocalScope`** (`ScopeManager.ts:71`). Vee `task`, `category`, `group`, `member` en `sync_queue` van die scope
  sonder enige tou, en die cursor. Dit vee ook ongestuurde veranderinge weg. `onChannelRemoved` is die plaasvervanger.
  Dit soek op `scope_id`, so dit raak nie persoonlike dokumente nie (`null`). Die pakket soek op `channel`, en dit
  sou hulle wel raak.
- **`MembershipService`.**
  - `sync` lees die lys en stoor dit, op `reconcileScopes` se antwoord indien beskikbaar.
  - `applyPersonalSync`: as Sync pas aangeskakel is, laai dit kontakname op en sit elke persoonlike `task` en `category`
    in die tou.
  - `addScope`/`removeScope`: atomies met `arrayUnion`/`arrayRemove`.
  - `reconcileScopes`: by app-oopmaak, verwyder scopes waarvan die groep beslis verwyder is. Foute hou die scope.
- **`membership` in `PushProcessor`** (`:15-30`). `sync_queue` dra ook items met `table_name: "membership"`,
  `entity_id: <uid>` en `op`. Dit is geen tabel nie, maar 'n duursame opdrag om iemand se lys te wysig, sodat aflyn-werk
  later uitgevoer word. Die gebruiker se **eie** verwydering gaan laaste, want dit trek die toegang in wat nodig is om
  die res van die scope te stuur. `deleteGroupHandler` hou dieselfde volgorde (`groups.ts:100`). Enigeen wat self lid
  is, mag een scope op 'n slag vir 'n ander wysig (`isMemberManaging`, reëls `:80`).
- **`sendEmailInvite`** (`functions/src/invites/send-email-invite.ts`). HTTP-funksie met Bearer-token. Weier as die
  e-pos reeds op Doenit is, reserveer in 'n transaksie (`email_invites/{email}/senders/{uid}` en `email_invite_quota`,
  20 per dag, een keer per week per ontvanger) en stuur dan via Resend. Dit raak geen scope nie en **verander nie**.
- **`ownership.ts`.** `owner_id` is die plaaslike gebruiker-id en verskil dus per toestel. `claimPersonalData` draai by
  elke `initApp` en gee onbekende persoonlike dokumente aan die gebruiker; `releasePersonalData` gee hulle by
  rekening-uitvee aan `"device"`. Albei skryf direk, sonder tou.
- **Veelvuldige gebruikers.** `user` hou elke rekening wat al op die toestel was. Die ander se data bly agter en word
  deur `visibleSelector` weggesteek (`owner_id`, `scope_id`).

## 5. Huidige `firestore.rules`

Alles behalwe `scopes` bly soos dit is. Volledige teks: `firestore.rules` (178 reëls).

| Pad | Lees | Skryf |
| --- | ---- | ----- |
| `user_profiles/{uid}` | `get` as ingeteken; `list` met `limit <= 5` | eienaar |
| `email_invites/{email}/senders/{uid}` | sender of e-pos se eienaar | net `delete`, dieselfde twee; skep deur funksie |
| `scopes/{scope}/items/{id}` | `canAccessScope` | `create`/`update`: `canAccessScope` en `synced_at == request.time`. `delete`: `canAccessScope` |
| `users/{uid}/meta/{doc}` | eienaar | eienaar, of `isMemberManaging` op `memberships` |
| `users/{uid}/push_tokens/{id}` | eienaar | eienaar, `token` is string onder 4096 |
| `users/{uid}/api_keys/{hash}` | eienaar | eienaar skep en vee uit, met veldkontroles |
| `users/{uid}/inbox_tasks/{id}` | eienaar | net `delete` |
| `users/{uid}/invites/{id}` | eienaar | skep/wysig met goedgevormdheid en toegelate statusoorgange, plus bedienertyd |
| `users/{uid}/notifications/{id}` | eienaar | enigeen skep met kontroles; eienaar wysig en vee uit |
| alles anders | nee | nee |

`canAccessScope` (`:50`): `personal_*` net as dit presies `personal_{auth.uid}` is, anders lidmaatskap. Die opmerking is
belangrik: enigiemand kan enige id in hul eie lys sit, so lidmaatskap mag nooit `personal_*` gee nie.

Nodige veranderinge in `scopes/{scope}/items/{id}`: bewaar `canAccessScope`; verwyder `delete`; voeg `channel == scope`
en `_v == resource.data.get('_v', 0) + 1` by (met `resource == null` as 0); en voeg die klok-reël by (8.5).

## 6. RxDB-navrae

Daar is **geen `$regex`** in die kode nie. Alle operateurs (`$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$exists`,
`$and`, `$or`) bestaan in die pakket. Geen enkele navraag het dus `filter` nodig vir die operateur self nie; net vir die
verskil van 8.11.

Die vorm verander so: `{ selector, sort: [{ a: "desc" }] }` word `{ where, sort: ["-a"] }`. `soft_deleted: { $ne: true }`
val weg, want die pakket laat grafstene by verstek uit.

### Lewende navrae

| Lêer:reël | Tabel | Navraag | Let op |
| --------- | ----- | ------- | ------ |
| `display/view/main_page.js:28` | task | `archived: false`, `soft_deleted != true`, `assigned_firebase_uid $in [null, uid]`, sort `due_date`, sigbaar | **8.11** |
| `display/view/main_page.js:36` | category | nie verwyder | Gebruik nie `visible$` nie |
| `display/view/main_page.js:38` | group | nie verwyder | |
| `display/view/done-page.js:25` | task | `$or [archived, completed > 0]`, nie verwyder, sort `-completed_at`, sigbaar | |
| `display/view/done-page.js:29` | category | nie verwyder | |
| `display/view/group_tasks.js:24` | task | `scope_id`, `archived != true`, nie verwyder, sort `due_date` | |
| `display/view/group_tasks.js:28-30` | category, member, contact | nie verwyder; `scope_id`; `user_id` | |
| `display/view/groups.js:47` | group | `$or [scope_id $in, owner_id]`, nie verwyder, sort `name` | |
| `display/view/groups.js:55-59` | member, contact, task | `scope_id $in`; `user_id`; `scope_id` `$eq` of `$in`, `archived != true` | |
| `display/view/categories.js:42,78` | category | sort `name`, sigbaar | Sien tans ook grafstene |
| `display/view/categories.js:43,79` | task | `archived != true`, nie verwyder, sigbaar | |
| `display/view/contacts.js:33` | contact | `user_id`, sort `name` | |
| `display/view/contacts.js:57` | contact_invite | `status $in`, `$or [from, to]`, sort `-updated_at` | **9** in afdeling 1 |
| `display/view/notifications.js:11` | notification | `user_id`, `read_at: null` | Moet `read_at` bestaan; `create` sit dit |
| `display/view/notifications.js:25` | notification | `user_id`, sort `-created_at` | **9** in afdeling 1 |
| `display/view/db.js:11,28,45,63` | user, category, task, sync_queue | alles | Ontfout-bladsy |
| `display/view/visible.js:17-21` | user_state, enige | `switchMap` op `active_scopes` | Herbou op `Live` |
| `services/widget.ts:34-36` | task, category, settings | `archived: false`, nie verwyder; alles | Net Android |
| `logic/context.svelte.ts:157,166,175,187,343` | user, settings, user_state, app_state | een dokument | `live({ where: { id } })` of `get` |
| `logic/context.svelte.ts:349` | task | `collection.$`: elke verandering | `db.task.live({})` |

### Eenmalige navrae

| Lêer:reël | Tabel | Navraag | Let op |
| --------- | ----- | ------- | ------ |
| `logic/visibility.ts:9` | (selector) | `owner_id` of `$or [owner_id, scope_id $in]` | Skryf om na `channel`, 8.6 |
| `logic/api/notifications.ts:107` | task | `assigned $in [uid, null]`, nie verwyder, `archived != true`, `$or [completed 0, repeat_interval $exists]`, sigbaar | **8.11** |
| `logic/api/categories.ts:15` | task | sigbaar | Sluit tans grafstene in, `:25` filter hulle |
| `logic/api/categories.ts:74` | task | `category_id` | |
| `logic/api/groups.ts:71-72,222,294,425`, `logic/notifications/TaskNotifier.ts:37` | member, task | `scope_id`, nie verwyder | |
| `logic/api/groups.ts:229` | contact | `user_id`, `firebase_uid $in` | |
| `logic/api/groups.ts:271` | contact | `user_id`, sort `name` | |
| `logic/api/groups.ts:331` | member | `scope_id`, `firebase_uid` **met** grafstene | `includeDeleted`, 8.10 |
| `logic/api/task.js:334,349,372` | task | `id $in` | Sien tans ook grafstene |
| `logic/api/auth.ts:156,164` | user | `firebase_uid`; `google_id` | |
| `logic/inbox/InboxService.ts:73` | category | nie verwyder, sigbaar | |
| `logic/invites/InviteService.ts:117-118` | contact_invite, contact | `status`; `user_id` | |
| `domain/tables/contact.ts:14` | contact | `relationship_id`, `owner_id` | |
| `domain/tables/contact_invite.ts:21,25` | contact_invite | `relationship_id` | |
| `domain/tables/notification.ts:21` | notification | `user_id`, `read_at: null` | Telling: `count` |
| `domain/tables/session.ts:13,18` | session, user | eerste; sort `-updated_at` | |
| `domain/sync/ContactNames.ts:47,62` | contact | `user_id` | |
| `services/backup.ts:52,54` | task, category | alles | Sluit tans grafstene in |
| `routes/db/[collection]/+page.js:12` | enige | alles | |

### Valt weg saam met die ou enjin

`domain/sync/SyncQueue.ts:7,45,101` (die enigste met `$gt`/`$lt` en retry), `ScopeManager.ts:77`,
`MembershipService.ts:49`, `ownership.ts:15`, `cursors.ts:21`, `tables/sync-table.ts:132`.

### Direkte RxDB buite die tabelle

Moet herskryf word: `logic/api/auth.ts:236` (`collection.find(...).remove()`), `context.svelte.ts:349`,
`domain/db.ts:79-85` (`getCollection`, `collectionNames`, gebruik deur `routes/db/`), `routes/db/[collection]/+page.svelte:18`,
`logic/chunk/rxdb.ts`, `logic/chunk/rxdb_helper.ts`.

## 7. Plaaslike data

| Tabel | Inhoud | Plan |
| ----- | ------ | ---- |
| `session` | `id: "current"`, `user_id` | `local` |
| `app_state` | `device_id`, `last_opened_at`, `open_count`, `app_version`, `migration_1_complete`, `home_mode`, `updated_at` | `local`. `device_id` is gereserveer: hernoem, bv. `device_uid` |
| `user_state` | `active_scopes`, `sync_cursors`, `open_count`, `last_opened_at`, `last_rate_prompt_at`, `last_backed_up`, `rate_prompt_count`, `has_rated`, `fcm_token`, `fcm_token_updated_at`, `home_mode` | `local`. `sync_cursors` bly nodig vir `s:__invites` en `s:__notifications` |
| `settings` | `id` is gebruiker of `"device"`; tema, taal, herinneringe, teksgrootte, ens. | `local`. `getSettings` kopieer van `device` na gebruiker |
| `user` | `name`, `avatar`, `email_address`, `google_id`, `firebase_uid` | `local`. `version`, `device_id`, `scope_id`, `soft_deleted` val weg |
| `contact`, `contact_invite`, `notification` | sien 3.2 | `local` met eie sinkro |
| `sync_queue` | Die ou tou | Val weg, behalwe `membership` (8.8) |

Buite die databasis, en dus onaangeraak:

- Tema in `localStorage` (`services/theme.ts:9`, gelees in `app.html:29` voor die app laai).
- `OAUTH_PENDING_KEY` in `localStorage` (`routes/+layout.ts:15`).
- Foto's op die lêerstelsel (`PHOTO_DIR`), tydelike media in `tempMediaManager`, en die wagtende voltooiings van die widget.
- Firebase Auth se sessie.

`MIGRASIE-SINKRO.md` noem konsepte, maar daar is **geen konsep-tabel of -veld** in die skemas nie.

## 8. Wat nie in die pakket pas nie

### 8.1 Persoonlike dokumente het geen kanaal nie

Drie toestande bestaan langs mekaar en die app wissel tussen hulle:

| Toestand | Tans | Firestore |
| -------- | ---- | --------- |
| Uitgeteken | `owner_id: "device"`, `scope_id: null` | nie |
| Ingeteken, Sync af | `owner_id: <gebruiker>`, `scope_id: null` | nie |
| Ingeteken, Sync aan | dieselfde | `personal_{uid}`, met `scope_id: null` |

`channel()` kry net die velde en `context`, en moet 'n nie-leë string gee. Dit kry nie die `id` nie, so
`doc.id` werk ook nie vir 'n groep nie: 'n nuwe groep moet sy id vooraf kry en `scope_id` by die invoeg stel.

Wat wel help: die enjin stuur net kanale wat in die lys is (`engine.ts:252`). 'n Kanaal buite die lys is dus 'n
gratis "net plaaslik"-toestand; die uitstaande items wag totdat die kanaal by die lys kom. Dit maak `applyPersonalSync`
se tou-logika oorbodig.

### 8.2 'n Kanaal is vas

`channel` is gereserveer en word net by `insert` gestel. Skuiwe wat bestaan:

- Inteken: `"device"`-take word die gebruiker s'n (`ownership.ts:25`).
- Sync aan of af.
- Rekening uitvee: persoonlike data gaan terug na `"device"` (`auth.ts:238`).
- Persoonlike taak word aan 'n groep gegee (`task.js:142`, `EditTask.svelte:99`).
- Groep sonder scope kry een (`groups.ts:320`).

Die eerste drie kan met 'n plaaslike ompak (dokumente en outbox kry 'n nuwe `channel`; stempels bly) sonder dat 'n
wolkkopie skade ly. Die pakket het dit nie. `purge` plus `insert` kan, maar stempel alles nuut en verloor `created_at`.

Taak-na-groep moet 'n **nuwe id** kry en die ou taak verwyder: plaaslik is `id` die primêre sleutel oor alle kanale heen,
so 'n grafsteen en 'n lewende kopie kan nie saam bestaan nie. Groepe kry hul scope van die begin af.

### 8.3 Kanale wat weggaan, word uitgevee

`forget` (`engine.ts`) vee alle dokumente, die outbox en die cursor van 'n kanaal uit. Die ou stelsel se gedrag verskil:

| Gebeurtenis | Tans | Met `channels` soos in die plan |
| ----------- | ---- | ------------------------------- |
| Sync af | Plaaslike take bly (`personal-sync.ts:24`) | Alle persoonlike take weg |
| Uitteken | Alles bly, weggesteek; aktiewe scopes bly | Alles weg as die lys leeg word; volle herlaai by inteken, ongestuurde werk weg |
| Ander rekening | Eerste rekening se data bly | Eerste rekening se data weg |
| Lys is `[]` by opstart | Nie relevant nie | **Alles weg**, ook aflyn |

Laasgenoemde is die gevaarlikste. `source.subscribe` roep `setChannels` onmiddellik, en 'n Svelte-`writable` stuur sy
beginwaarde dadelik. `before` kom uit die gestoorde lys, so `[]` beteken alles is "weg". Die store kan ook nie uit die
databasis gevul word voor die databasis bestaan nie, want `session` en `user_state` is daarin. Dus: 'n eie `subscribable`
wat **eers iets stuur** as die lys bekend is (uit `user_state.active_scopes`, of die bediener). `subscribeScopes` is
reeds versigtig vir aflyn (`firestore.ts:368`); die store moet dit bly.

### 8.4 Eerste begin (stap 6) verloor plaaslike data

Stap 6 onderskei "ongestuurde veranderinge" van "trek alles vars af", maar die volgende is nêrens in die wolk nie:

- take en kategorieë van wie nie Sync aan het nie, of uitgeteken is;
- groepe sonder scope;
- `settings`, `user`, `session`, `app_state`, `user_state`, `contact` (name), `contact_invite.contact_name`.

Hulle staan ook nie in `sync_queue` nie. Stap 6 moet dus **alles kopieer wat nie in 'n aktiewe scope is nie**, en net die
res aftrek. Kennisgewings is wel in die wolk, maar 'n vars pull haal net die nuutste 50 (`fetchNotifications`), so ouer
ones op die toestel moet ook gekopieer word.

Die twee soorte moet ook anders hanteer word. 'n Gewone `insert` stempel elke veld met `nou`, sodat ou plaaslike
waardes nuwer wolk-waardes wen wanneer hulle saamsmelt, en `created_at` gaan verlore. Die `field_hlc` moet uit
`field_times` kom, net soos in die skrip. Die pakket het nie 'n invoer-oproep hiervoor nie.

Die ou databasis moet gelees word sonder RxDB. `src/lib/logic/migrations/1_2/migration.ts:47-93` doen presies dit
(`rxdb-dexie-<naam>--<weergawe>--<tabel>`, `docs`-winkel, `_deleted` as `"1"` of `true`) en kan as sjabloon dien. Name:
`doenit-db`, huidige weergawes in afdeling 3. Die nuwe databasis moet 'n ander naam kry.

`migrations/1_2` gebruik `DB.task.createMany` en `DB.category.createMany` en loop steeds
(`routes/(main)/+layout.svelte:75-80`). Dit moet vir baie ou installasies bly werk of bewustelik weggaan.

### 8.5 Die klok

`serverTime` skryf `sinkro/~time/clients/{clientId}` en lees dit terug voor elke lopie (10 minute gekas). Die eie
`layout` in die plan vervang nie `time` nie, en die vang-alles-reël weier dit. `engine.run` meet die klok eerste, so sonder
'n reël faal **elke** lopie met `permission-denied`. Voeg die `~time`-blok uit `firestoreRules` by.

`clientId` is lukraak per app-begin en word nooit opgeruim nie, so hierdie versameling groei met een dokument per begin.
Dit kos min, maar groei vir ewig.

### 8.6 `owner_id`

`owner_id` verskil per toestel, en `setOwner` skryf dit sonder om te sinkroniseer. In die pakket is elke `update` 'n
gestempelde skryf, so dit sou tussen toestelle heen en weer wip.

- `task` en `category`: laat `owner_id` val. Sigbaarheid word `channel`: my `personal_{uid}`, die plaaslike kanaal, of
  'n aktiewe groep. Dit maak `ownership.ts` en `visibleSelector` se `owner_id` oorbodig.
- `group`: `owner_id` bepaal wie mag ontbind (`groups.ts:59`). Dit is reeds stukkend op 'n tweede toestel van dieselfde
  gebruiker, want dit vergelyk met die plaaslike id. Die korrekte waarde is die eienaar se `firebase_uid`; die
  admin-`member`-ry het dit reeds. Die API skryf ook reeds die uid in `owner_id` (`store.ts:69`).
- `member.owner_id`: word nêrens gelees nie, kan weg.

### 8.7 Cloud Functions

Nie in die plan nie, maar dit moet saam met die reëls ontplooi word.

| Lêer | Probleem |
| ---- | -------- |
| `functions/src/api/store.ts:22` `writeItem` | `set` vervang die hele dokument. `_v` word nie verhoog nie, en `field_hlc`, `hlc`, `deleted`, `channel`, `_sets` word nie gestel nie |
| `store.ts:33` `stampChange` | Stempel `field_times`. In `mergeDocs` wen die toestel se ou stempel dan, so die API-verandering gaan **stilweg** verlore |
| `store.ts:45,48,84`, `list-tasks.ts:17`, `delete-task.ts:10` | Lees of skryf `soft_deleted` |
| `create-task.ts`, `store.ts:61` | Skep ou-formaat dokumente met `version`, `device_id`, sonder `deleted` |
| `account/delete-account.ts:45-47` | Merge van `soft_deleted` en `assigned_firebase_uid` sonder stempels of `_v` |

Admin SDK gaan om die reëls, so niks weier dit nie. Dit moet 'n klein bedienerkant-helper kry: stempel per veld met
`<ms>-0000-api`, `_v + 1`, en `hlc` as die grootste. `where("collection", ...)` bly werk.

`tests/sharing/sim.js` en `scenarios.test.js` modelleer die ou enjin, en `sim.js` importeer `schema/task.ts`, so hulle moet
herskryf word of weg.

### 8.8 Wat bly: `src/lib/domain/sync/` kan nie heeltemal weg nie

"Geen `src/lib/domain/sync/` meer nie" kan wel, maar die volgende moet eers elders heen:

- **Uitnodigings en kennisgewings.** `InviteService.pull`, `NotificationService.pull`, hul watchers, en
  `patchSyncCursors`/`cursorKey`. Hulle het twee kopieë, eie statusoorgange en skrywers wat nie lede is nie. Hulle pas
  nie in 'n kanaal nie en moet `local`-tabelle met die huidige kode bly. Die pakket het geen `upsert` nie, so `get` plus
  `insert`/`update`.
- **Kontakname.** `ContactNames.ts` skryf 'n kaart na `meta/contact_names`.
- **Lidmaatskap-opdragte.** 'n Klein duursame tou bly nodig vir `membership`, met eie verwydering laaste. Die volgorde kan
  eenvoudiger word: vir verwydering, `await db.sync.flush()` en dan die lidmaatskap. Vir byvoeging is die volgorde vanself
  reg, want 'n kanaal stuur eers wanneer dit in die lys is.
- **`personal.ts`**, `firestore.ts` se res, en `reconcileScopes`.

### 8.9 Ander naamgevings- en metaprobleme

- Gereserveer in **alle** tabelle: `version`, `device_id`, `channel`, `deleted`, `hlc`, `field_hlc`. Raak `app_state`,
  `user`, `task`, `category`, `group`, `member`.
- **`update` ná `remove`.** `task.js:154,284` roep `update(... archived: false)` na 500 ms. Ná `remove` gooi dit
  `NOT_FOUND`.
- **Hele-dokument-`update`.** `task.js:147,280,316` stuur die hele taak, insluitend `id`, `created_at`, `soft_deleted`,
  `version`. Die pakket gooi by enige veld buite die skema. `undefined` beteken ook iets anders: die pakket vee die veld
  uit, `TaskTable.update` se `JSON`-kopie laat dit tans val.
- **Uitsonderings teenoor Result.** Die pakket gooi; Doenit verwag `{ ok, value? }`. Hou die dun tabel-klasse as omhulsel:
  daar is 173 oproepe in 34 lêers, en `TaskTable` se validasie moet bly.
- **`updated_at` by `local`-tabelle.** `markAsRead` (`notification.ts:33`) en ander stuur dit self, wat nou weier.
- **`backup.ts`.** Gebruik `schema.task.version` en `createRaw`/`updateRaw`. Herstel van ou rugsteune moet `soft_deleted`
  en `field_times` omskakel. Begin die pakket se `version` by 0, dan word elke ou rugsteun geweier
  (`backup.ts:109`); hou dit op minstens 2 vir `task` en 1 vir `category`.
- **`rxjs`** staan nie in `package.json` nie; dit kom via `rxdb`. 15 lêers gebruik dit, en `combineLatest`/`switchMap` is
  die kern van die view-laag. Voeg dit direk by, of skryf om na `liveQuery`. Stap 4 is groter as wat dit lyk.
- **`dexie`** kom ook via `rxdb`, en `.npmrc` bestaan reeds in git (stap 2 sê om dit te skep).
- **`multiInstance`.** Die web-weergawe kan in veelvuldige oortjies oop wees. RxDB is met `multiInstance: false` gestel,
  en die pakket het geen `BroadcastChannel` of iets dergeliks nie, so veranderinge word nie tussen oortjies gedeel nie.
- **`category.remove`** vee hard uit en stuur niks, terwyl kategorieë wel sinkroniseer (`tables/category.ts:22`, die
  opmerking is verouderd). Verwyderde kategorieë kom dus terug. Die pakket se `remove` los dit op.

### 8.10 Lede herbyvoeg

`upsertMember` lewendig 'n verwyderde lid op met `soft_deleted: false` (`groups.ts:353`). Die pakket laat dit nie toe nie:
`update` gooi `NOT_FOUND` op 'n grafsteen, en `insert` gooi `DUPLICATE`. Herbyvoeg moet 'n nuwe ry met 'n nuwe id wees.
`findMember` hoef dan nie meer grafstene te sien nie.

### 8.11 Verskille in navraag-betekenis

- `{ veld: { $in: [null, x] } }` en `{ veld: null }`: Mango vang 'n ontbrekende veld, die pakket nie. `getNewTask` sit
  `assigned_firebase_uid: undefined`, so dié veld ontbreek gereeld. Raak `main_page.js:32` en
  `api/notifications.ts:111`. Oplossing: `.nullable().default(null)` plus 'n `$or` met `$exists: false` vir ou dokumente,
  want `default` geld net by invoeg. `filter` kan ook.
- Sonder `includeDeleted` sien die navrae in `task.js:334,349,372`, `categories.ts:74` en `backup.ts:52` nie meer grafstene
  nie. Dit is 'n verbetering, maar `removeMany` se "almal gevind"-kontrole moet weg.
- `sort`: `null` en ontbrekend eerste, soos tans. Bewaar `due_date`.
- `date-time`-formaat en `enum` bestaan nie in die pakket nie. Die reëls kontroleer `notification.type`; die res word nie
  gekontroleer nie.

### 8.12 Omskakelskrip (stap 5): aanvullings

Wat die skrip addisioneel moet doen:

1. `deleted = soft_deleted === true` en `field_hlc.deleted` uit `field_times.soft_deleted`, anders kom grafstene terug.
2. Pas die ou reël vir ontbrekende tye toe (afdeling 2). `member` het nooit `field_times` nie; API-take (`create-task`),
   `firestore.delete`-grafstene en ou dokumente ook nie. Tye as `Date.parse`, gepolster tot 13 syfers; 'n onleesbare
   waarde word 0.
3. Sluit `id`, `created_at`, `updated_at`, `version`, `device_id`, `owner_id`, `field_times`, `collection`, `synced_at`
   uit `field_hlc` uit.
4. Knip toekomstige tye tot skrip-tyd: 'n vinnige toestel-klok sou anders later wysigings wen.
5. `_sets` vir **elke** dokument met 'n stel-veld, ontdubbel. `mergeDocs` bou die waarde net uit `_sets`, so 'n dokument
   daarsonder verloor sy foto's. Volgorde: stempels is gelyk, so `setValues` sorteer op sleutel; foto's kan van orde verander.
6. Rapporteer dokumente sonder `collection`, name wat `validChannel` weier, en **dieselfde id in meer as een scope**. Die
   laaste kan bestaan: 'n persoonlike taak wat aan 'n groep gegee is, laat sy ou kopie in `personal_{uid}` agter
   (`firestore.upsert` skryf net na die nuwe scope). Plaaslik is daar net een ry per id, so die twee kanale sou in
   mekaar smelt, en 'n grafsteen in die persoonlike kanaal sou ook die groep-taak verwyder. Aanbeveling: die skrip vee
   die persoonlike kopie hard uit. Dit is veilig omdat elke toestel in elk geval van voor af aftrek, en die groep-kopie
   is die nuutste.
7. Die skrip moet weer ná die reëls loop. Ou apps kan tussen skrip en reëls dokumente oorskryf en `field_hlc` verwyder;
   die voorwaarde "nog nie `field_hlc` nie" vang dit.

Die latere opruiming moet ook `soft_deleted`, `version`, `device_id` en `owner_id` verwyder, en plaaslike `_extra` raak
ontslae van `field_times` net as dit ook uit die wolk weg is.

### 8.13 Koste

Geheue-reël: min Firebase-kostes. Nuut teenoor tans:

- Elke push is 'n transaksie: een lees plus een skryf per dokument. Tans net 'n skryf.
- Klok: een skryf plus een lees per 10 minute se aktiwiteit, per toestel.
- Eerste begin: elke toestel lees elke dokument in elke scope weer, omdat alle `synced_at`-waardes nuut is en die cursor leeg.
- Die luisteraar bly `orderBy(synced_at, desc)` met `limit(1)`, soos tans.

## 9. Regstellings aan `MIGRASIE-SINKRO.md`

- Tak `fase-6-doenit` bestaan nie; die werk is op `sinko-db-migrasie`.
- "Doenit het reeds 'n `latest`-weergawe in Firestore": **nie gevind nie**. Geen `latest`, `min_version` of dergelike
  in `src`, `functions/src` of `firestore.rules` nie, en die reëls sal die lees weier. Die weergawe-hek moet nog gebou
  word, of dit leef êrens buite die repo. Die nuwe reëls blokkeer ou apps se skryfwerk wel vanself; hulle lees steeds en
  sal foute herhaal.
- Stap 8 se volgorde: funksies saam met die reëls; skrip weer ná die reëls (8.12).

## 10. Besluite vir Tertius

Elkeen met my aanbeveling.

- **B1. Kanale vir persoonlike data en skuiwe.** Aanbeveling: uitbreiding in `sinkro-db` 0.2, `db.sync.moveChannel(from, to)`,
  wat dokumente en outbox ompak en stempels hou. Kanale: groep = `scope_id`; ingeteken = `personal_{uid}`; plaaslik =
  `local_{uid}`; uitgeteken = `device`. Sync af skuif `personal_` na `local_`, voor die lys krimp. Die alternatief,
  `purge` plus `insert` in die app, stempel alles nuut, en dit laat 'n volledige heroplaai volg.
- **B2. Invoer.** Aanbeveling: 'n tweede uitbreiding, `db.<tabel>.import(docs)`, wat `created_at`, `updated_at`,
  `field_hlc` en `channel` onveranderd stoor. Nodig vir stap 6 en `backup.ts`. Vir uitnodigings en kennisgewings is dit
  ook die oplossing vir bevinding 9, anders kry hulle eie velde soos `remote_updated_at`.
- **B3. Uitteken.** Aanbeveling: skuif `personal_{uid}` na `local_{uid}`, en laat groepdata uitgevee word en by inteken
  weer aftrek. Dit kos lees, maar is die eenvoudigste. Ongestuurde werk: probeer eers `db.sync.flush()`.
- **B4. Tabelle.** Aanbeveling: `synced` geld net vir `task`, `category`, `group`, `member`; `contact`, `contact_invite`,
  `notification` word `local` met die huidige sinkro-kode, geskuif na `src/lib/logic/`. Dit wysig die besluit "alle tabelle
  is `synced`".
- **B5. Stel-velde.** Aanbeveling: `photo_ids` as `set` (twee toestelle voeg elk 'n foto by en albei bly);
  `repeat_specific_days` as lww (dae word as geheel gekies, en 'n samesmelting gee dae wat niemand gekies het nie).
- **B6. Funksies.** Aanbeveling: 'n nuwe stap tussen 5 en 6 vir `functions/src/api` en `delete-account`, met dieselfde
  stempel-helper. Stap 8 ontplooi hulle saam met die reëls.
- **B7. Stap 6.** Aanbeveling: wysig soos in 8.4: kopieer alles wat nie in 'n aktiewe scope is nie, en bou `field_hlc`
  uit `field_times`.
- **B8. Eienaarskap.** Aanbeveling: `owner_id` weg uit `task`, `category`, `member`. `group.owner_id` word die eienaar se
  `firebase_uid`. Die skrip ken nie plaaslike id's nie, so dit lees die uid van die groep se admin-`member`-ry.
- **B9. Weergawe-hek.** Waar leef `latest`? As dit nie bestaan nie, moet dit in die plan.
- **B10. `rxjs`.** Aanbeveling: voeg dit eers as direkte afhanklikheid by en laat die view-laag so, met 'n klein
  `Live`-na-`Observable`-brug, sodat stap 4 klein bly. Haal dit later uit.
- **B11. Oortjies op die web.** Aanbeveling: vir nou net een oortjie ondersteun, soos RxDB se `multiInstance: false`.
- **B12. Tak.** Hou `sinko-db-migrasie`, of hernoem na `fase-6-doenit`?
