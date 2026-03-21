# 📁 `app/`

## Role

Application logic and orchestration.

This layer decides **what should happen** when the user performs an action.

It:

* Validates inputs
* Coordinates multiple domain operations
* Calls services
* Implements business rules
* Handles navigation decisions (BackHandler)

It is the behavioral brain of the app.

---

## It May:

* Call `domain/` (read and write)
* Call `services/`
* Be called by `display/`

---

## It Must NOT:

* Render UI
* Contain storage implementation details
* Talk directly to external SDKs without going through services

---

## Questions to Ask

* Does this decide how data changes?
* Does this coordinate multiple actions?
* Does this interpret results from services?
* Would this logic exist even if there were no UI?

If yes → `app/`