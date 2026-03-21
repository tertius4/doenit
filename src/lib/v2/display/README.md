# 📁 `display/`

## Role

Everything related to rendering and presenting the UI.

This layer is responsible for:

* Components
* Routes
* Layouts
* UI state (context)
* Reactive projections of data for rendering

It describes **what is visible**, not what should happen.

It does not contain business rules or persistence logic.

---

## It May:

* Call `app/` functions (API, BackHandler)
* Read from `domain/` indirectly via context or view helpers
* Hold filtered/sorted UI data
* Manage UI-only state (open modal, selected tab)

---

## It Must NOT:

* Modify persistent data directly
* Contain business rules
* Call external SDKs
* Access database or storage directly

---

## Questions to Ask

* Is this responsible for rendering something?
* Is this UI-only state?
* Would deleting this affect how things look but not how data behaves?

If yes → `display/`

