# Doenit API

Create Doenit tasks from anywhere: scripts, Zapier, Make, iOS Shortcuts, Android HTTP Shortcuts, or a plain `curl` command.

- [Quick start](#quick-start)
- [When will my task show up?](#when-will-my-task-show-up)
- [Authentication](#authentication)
- [Endpoint](#endpoint)
- [Request fields](#request-fields)
- [Dates](#dates)
- [Repeating tasks](#repeating-tasks)
- [Responses](#responses)
- [Error codes](#error-codes)
- [Examples](#examples)
- [Limits and privacy](#limits-and-privacy)

## Quick start

1. In Doenit, sign in and open **Settings → API access**.
2. Type a name for the key (for example "Zapier") and tap **Create key**.
3. Copy the key. **It is only shown once.**
4. Send a task:

```bash
curl -X POST https://africa-south1-doenit2.cloudfunctions.net/api/v1/tasks \
  -H "Authorization: Bearer dk_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Buy milk"}'
```

## When will my task show up?

Tasks sent through the API wait safely in the cloud. They appear in Doenit when the app is **open and connected to the internet**.

| Your phone | What happens |
|---|---|
| App open and online | The task appears within a few seconds. |
| App closed, or phone offline | Nothing is lost. The task is added as soon as you open Doenit again. |

**More than one device?** A personal task is added to the first device that opens Doenit. Group tasks reach everyone in the group.

## Authentication

Every request needs your key in the `Authorization` header:

```
Authorization: Bearer dk_<your key>
```

- **Treat a key like a password.** Anyone with it can add tasks to your Doenit.
- Doenit only stores a fingerprint (a SHA-256 hash) of the key, never the key itself. A lost key can't be recovered: revoke it and create a new one.
- To revoke a key, open **Settings → API access** and tap **Revoke** and confirm. It stops working immediately.
- You can have up to 10 keys, for example one per integration.

## Endpoint

```
POST https://africa-south1-doenit2.cloudfunctions.net/api/v1/tasks
Content-Type: application/json
```

## Request fields

| Field | Type | Required | Rules | Example |
|---|---|---|---|---|
| `name` | string | **yes** | 1–500 characters | `"Buy milk"` |
| `description` | string | no | Up to 5000 characters | `"2 litres, full cream"` |
| `due_date` | string | no | A date, optionally with a time. See [Dates](#dates). Sent on its own, it becomes the task's date. | `"2026-10-10 17:00"` |
| `start_date` | string | no | Same as `due_date`; must be on or before it. Send both for a date range. | `"2026-10-09"` |
| `important` | boolean | no | Default `false` | `true` |
| `category` | string | no | Up to 100 characters. Matched by name, ignoring case. **A missing category is created.** | `"Shopping"` |
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
{ "name": "Put out the bins", "due_date": "2026-10-12 07:00", "repeat": { "interval": "weekly", "every": 2 } }
```

Mondays, Wednesdays and Fridays:

```json
{ "name": "Gym", "due_date": "2026-10-12 06:00", "repeat": { "interval": "weekly_custom_days", "days": ["mon", "wed", "fri"] } }
```

Leave `repeat` out (or send `null`) for a task that doesn't repeat. An unknown `interval`, an unknown field inside `repeat`, or `every`/`days` used with an interval that doesn't support them is rejected with a `400`.

> Doenit versions released before repeat support add the task without repeating. Update the app to get repeating tasks.

## Responses

Every response uses the same shape.

**Success**: `201 Created`

```json
{ "ok": true, "value": { "id": "8b1d6a8e-5d0c-4c1e-9f6a-2f7f0d7a1b2c" } }
```

`id` is the id the task will have in Doenit.

**Failure**

```json
{ "ok": false, "error": "name is required" }
```

## Error codes

| Status | Meaning | What to do |
|---|---|---|
| `400` | The request body is invalid (missing `name`, bad date, unknown field, unknown group, bad `repeat`, …). | Read `error`, fix the request. |
| `401` | The key is missing, mistyped or revoked. | Check the `Authorization` header or create a new key. |
| `404` | Wrong URL. | Use `/api/v1/tasks`. |
| `405` | Wrong HTTP method. | Use `POST`. |
| `429` | Your inbox is full: **100 tasks** are waiting to be added. | Open Doenit so they are added, then try again. |
| `500` | Something went wrong on our side. | Try again later. |

## Examples

### curl

```bash
curl -X POST https://africa-south1-doenit2.cloudfunctions.net/api/v1/tasks \
  -H "Authorization: Bearer dk_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Pay rent", "due_date": "2026-11-01", "important": true, "category": "Finances"}'
```

A repeating task, due on the 1st of every month:

```bash
curl -X POST https://africa-south1-doenit2.cloudfunctions.net/api/v1/tasks \
  -H "Authorization: Bearer dk_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Pay rent", "due_date": "2026-11-01", "repeat": {"interval": "monthly"}}'
```

### JavaScript

```js
const response = await fetch("https://africa-south1-doenit2.cloudfunctions.net/api/v1/tasks", {
  method: "POST",
  headers: { Authorization: "Bearer dk_YOUR_KEY", "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Call the plumber", due_date: "2026-10-12 09:00" }),
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
    json={"name": "Water the plants", "category": "Home"},
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

- **Pending tasks:** up to 100 tasks can wait in your inbox at once. Each one is removed from the cloud as soon as Doenit adds it.
- **Keys:** at most 10 per account. Only a hash of each key is stored.
- **What is stored in the cloud:** only the fields you send, until the app picks them up. Personal tasks then live on your device, as all personal tasks in Doenit do.
- **Groups:** `group_id` must be a group you are a member of; others are rejected.
