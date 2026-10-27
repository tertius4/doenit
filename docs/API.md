# Doenit API

Read, create, change and delete Doenit tasks from anywhere: scripts, Zapier, Make, iOS Shortcuts, Android HTTP Shortcuts, or a plain `curl` command.

- [Quick start](#quick-start)
- [When will my task show up?](#when-will-my-task-show-up)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
- [The task object](#the-task-object)
- [Request fields](#request-fields)
- [Dates](#dates)
- [Repeating tasks](#repeating-tasks)
- [List tasks](#list-tasks)
- [Change a task](#change-a-task)
- [Delete a task](#delete-a-task)
- [Responses](#responses)
- [Error codes](#error-codes)
- [Examples](#examples)
- [Limits and privacy](#limits-and-privacy)

## Quick start

1. In Doenit, open **Settings** and **Sign in**.
2. Turn on **Sync**. The API works on the tasks Doenit keeps in the cloud, so it needs Sync.
3. Open the **API access** section.
4. Type a name for the key (for example "Zapier") and tap **Create key**.
5. Copy the key. **It is only shown once.**
6. Send a task:

```bash
curl -X POST https://africa-south1-doenit2.cloudfunctions.net/api/v1/tasks \
  -H "Authorization: Bearer dk_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Koop melk"}'
```

## When will my task show up?

A task sent through the API is stored in the cloud straight away. Every device you are signed in on picks it up **within seconds** while it is online, or as soon as it comes back online. Group tasks reach everyone in the group.

Changes made in the app show up in the API right away too, as soon as the phone that made them is online.

## Authentication

Every request needs your key in the `Authorization` header:

```
Authorization: Bearer dk_<your key>
```

- **Treat a key like a password.** Anyone with it can read, add, change and delete your tasks.
- Doenit only stores a fingerprint (a SHA-256 hash) of the key, never the key itself. A lost key can't be recovered: revoke it and create a new one.
- To revoke a key, open **Settings → API access** and tap **Revoke** and confirm. It stops working immediately.
- You can have up to 10 keys, for example one per integration.
- Keys only work while **Sync** is on. With Sync off, every request gets a `403`.

## Endpoints

```
GET    https://africa-south1-doenit2.cloudfunctions.net/api/v1/tasks        List your tasks
POST   https://africa-south1-doenit2.cloudfunctions.net/api/v1/tasks        Create a task
PATCH  https://africa-south1-doenit2.cloudfunctions.net/api/v1/tasks/{id}   Change a task
DELETE https://africa-south1-doenit2.cloudfunctions.net/api/v1/tasks/{id}   Delete a task
```

Send `Content-Type: application/json` with `POST` and `PATCH`.

## The task object

Every endpoint that returns a task uses this shape:

```json
{
  "id": "8b1d6a8e-5d0c-4c1e-9f6a-2f7f0d7a1b2c",
  "name": "Betaal huur",
  "description": "",
  "due_date": null,
  "start_date": "2026-11-01",
  "important": true,
  "category": "Finansies",
  "group_id": null,
  "repeat": { "interval": "monthly", "every": 1 },
  "completed": false,
  "completed_at": null,
  "created_at": "2026-10-27T09:12:03.120Z",
  "updated_at": "2026-10-27T09:12:03.120Z"
}
```

- `start_date` holds the task's date. `due_date` is only set when the task spans a date range (then `start_date` is the start).
- `group_id` is `null` for a personal task.
- `repeat` is `null` for a task that doesn't repeat. See [Repeating tasks](#repeating-tasks).
- `completed` is `true` once the task is done. A repeating task never stays completed: completing it moves it on to its next date, as in the app. `completed_at` then shows when it was last done.

## Request fields

These are the fields you can send with `POST` (create) and `PATCH` (change).

| Field | Type | Required | Rules | Example |
|---|---|---|---|---|
| `name` | string | **yes** for `POST` | 1–500 characters | `"Koop melk"` |
| `description` | string | no | Up to 5000 characters | `"2 liter, volroom"` |
| `due_date` | string | no | A date, optionally with a time. See [Dates](#dates). Sent on its own, it becomes the task's date. | `"2026-10-10 17:00"` |
| `start_date` | string | no | Same as `due_date`; must be on or before it. Send both for a date range. | `"2026-10-09"` |
| `important` | boolean | no | Default `false` | `true` |
| `category` | string | no | Up to 100 characters. Matched by name, ignoring case. **A missing category is created.** | `"Inkopies"` |
| `group_id` | string | no | A group you belong to. In Doenit, open the group and tap **Copy group ID**. | `"3f2c…"` |
| `repeat` | object | no | Makes the task repeat. Needs a `due_date` or `start_date`. See [Repeating tasks](#repeating-tasks). | `{"interval": "weekly"}` |

Any other field is rejected with a `400`, so typos are caught early.

### Dates

Dates are year first: `YYYY-MM-DD`, optionally followed by a time `HH:mm` after a space or a `T`. Leading zeros are optional.

| You send | Saved as |
|---|---|
| `2026-05-05` or `2026-5-5` | 5 May 2026 (all day) |
| `2026-05-05 09:00` or `2026-5-5 9:00` | 5 May 2026, 09:00 |
| `2026-05-05T09:00:00Z` or `2026-05-05T09:00:00+02:00` | 5 May 2026, 09:00 |
| `2026-13-01` | 1 January 2027 |

- The time is kept exactly as you write it. Seconds and a timezone (`Z`, `+02:00`) are allowed but ignored.
- Values past the end of a month or year roll over, so `2026-02-30` is 2 March and `24:00` is midnight the next day.
- Any other format, such as `05/06/2026` or `5 May 2026`, is rejected with a `400`.

## Repeating tasks

Add a `repeat` object to make a task come back when you complete it, just like choosing **Repeat** in the app. A repeating task needs a `due_date` or `start_date`; that is the first time it is due.

| Field | Type | Required | Rules |
|---|---|---|---|
| `interval` | string | **yes** | One of the intervals below. |
| `every` | number | no | Whole number from 1 to 500, default `1`. Only for `daily`, `weekly`, `monthly` and `yearly`. |
| `days` | array of strings | only for `weekly_custom_days` | Any of `sun`, `mon`, `tue`, `wed`, `thu`, `fri`, `sat` (case doesn't matter). |

| `interval` | Repeats |
|---|---|
| `daily` | Every day, or every `every` days |
| `workdaily` | Every weekday (Monday to Friday) |
| `weekly` | Every week, or every `every` weeks |
| `weekly_custom_days` | On the chosen `days` every week |
| `monthly` | Every month, or every `every` months |
| `yearly` | Every year, or every `every` years |

Every second week:

```json
{ "name": "Sit die vullisdromme buite", "due_date": "2026-10-12 07:00", "repeat": { "interval": "weekly", "every": 2 } }
```

Mondays, Wednesdays and Fridays:

```json
{ "name": "Oefen", "due_date": "2026-10-12 06:00", "repeat": { "interval": "weekly_custom_days", "days": ["mon", "wed", "fri"] } }
```

Leave `repeat` out (or send `null`) for a task that doesn't repeat. An unknown `interval`, an unknown field inside `repeat`, or `every`/`days` used with an interval that doesn't support them is rejected with a `400`.

> Doenit versions released before repeat support add the task without repeating. Update the app to get repeating tasks.

## List tasks

```
GET /api/v1/tasks
```

Returns all your open tasks, personal and from every group you are in, as an array of [task objects](#the-task-object).

Add `?include_completed=true` to include completed tasks.

```bash
curl https://africa-south1-doenit2.cloudfunctions.net/api/v1/tasks \
  -H "Authorization: Bearer dk_YOUR_KEY"
```

## Change a task

```
PATCH /api/v1/tasks/{id}
```

Send only the fields you want to change. Any [request field](#request-fields) works, plus:

| Field | Type | Rules |
|---|---|---|
| `completed` | boolean | `true` completes the task, `false` opens it again. Completing a repeating task moves it on to its next date. |

- Send `null` to clear a field, for example `"due_date": null` or `"repeat": null`.
- The result must still be a valid task: a repeating task needs a date, and `start_date` must be on or before `due_date`.
- `group_id` can't be changed. Sending a different one is rejected with a `400`.
- Returns the changed [task object](#the-task-object).

```bash
curl -X PATCH https://africa-south1-doenit2.cloudfunctions.net/api/v1/tasks/8b1d6a8e-5d0c-4c1e-9f6a-2f7f0d7a1b2c \
  -H "Authorization: Bearer dk_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

## Delete a task

```
DELETE /api/v1/tasks/{id}
```

Deletes the task on all your devices (and for everyone in the group, for a group task). Returns `{ "ok": true }`.

## Responses

Every response uses the same shape.

**Success**: `200 OK`, or `201 Created` for a new task.

```json
{ "ok": true, "value": { "id": "8b1d6a8e-5d0c-4c1e-9f6a-2f7f0d7a1b2c", "name": "Koop melk", "...": "..." } }
```

`value` is a [task object](#the-task-object), an array of them for `GET`, or left out for `DELETE`.

**Failure**

```json
{ "ok": false, "error": "name is required" }
```

## Error codes

| Status | Meaning | What to do |
|---|---|---|
| `400` | The request body is invalid (missing `name`, bad date, unknown field, unknown group, bad `repeat`, …). | Read `error`, fix the request. |
| `401` | The key is missing, mistyped or revoked. | Check the `Authorization` header or create a new key. |
| `403` | Sync is off. | Turn on **Sync** in Doenit's settings. |
| `404` | Wrong URL, or no task with that id (it may have been deleted). | Use `/api/v1/tasks` or `/api/v1/tasks/{id}`. |
| `405` | Wrong HTTP method. | `GET`/`POST` on `/v1/tasks`, `PATCH`/`DELETE` on `/v1/tasks/{id}`. |
| `500` | Something went wrong on our side. | Try again later. |

## Examples

### curl

```bash
curl -X POST https://africa-south1-doenit2.cloudfunctions.net/api/v1/tasks \
  -H "Authorization: Bearer dk_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Betaal huur", "due_date": "2026-11-01", "important": true, "category": "Finansies"}'
```

A repeating task, due on the 1st of every month:

```bash
curl -X POST https://africa-south1-doenit2.cloudfunctions.net/api/v1/tasks \
  -H "Authorization: Bearer dk_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Betaal huur", "due_date": "2026-11-01", "repeat": {"interval": "monthly"}}'
```

### JavaScript

```js
const response = await fetch("https://africa-south1-doenit2.cloudfunctions.net/api/v1/tasks", {
  method: "POST",
  headers: { Authorization: "Bearer dk_YOUR_KEY", "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Bel die loodgieter", due_date: "2026-10-12 09:00" }),
});
const result = await response.json();
if (!result.ok) console.error(result.error);
```

### Python

```python
import requests

result = requests.post(
    "https://africa-south1-doenit2.cloudfunctions.net/api/v1/tasks",
    headers={"Authorization": "Bearer dk_YOUR_KEY"},
    json={"name": "Gee die plante water", "category": "Huis"},
).json()

if not result["ok"]:
    print(result["error"])
```

### iOS Shortcuts

1. Add the **Ask for Input** action (Text). This is the task name.
2. Add **Get Contents of URL**:
   - URL: `https://africa-south1-doenit2.cloudfunctions.net/api/v1/tasks`
   - Method: `POST`
   - Headers: `Authorization` = `Bearer dk_YOUR_KEY`
   - Request Body: `JSON`, with field `name` = *Provided Input*
3. Run it, or say "Hey Siri, *shortcut name*".

### Android (HTTP Shortcuts app)

1. Create a new shortcut with method `POST` and the URL above.
2. Under **Request Headers**, add `Authorization` = `Bearer dk_YOUR_KEY`.
3. Under **Request Body**, choose *Custom Text* with content type `application/json` and body `{"name": "{{task}}"}`. Add a text variable called `task` that prompts for the name.
4. Add the shortcut to your home screen.

## Limits and privacy

- **Sync is required.** The API works on the copy of your tasks that Sync keeps in the cloud (Google Firebase, Johannesburg). With Sync off, the API is switched off too.
- **Keys:** at most 10 per account. Only a hash of each key is stored.
- **Groups:** `group_id` must be a group you are a member of; others are rejected. The API can read and change every task in your groups, just like you can in the app.
