# 📁 `domain/`

## Role

Core data model and persistence rules.

This layer manages:

* Entities
* Database access
* Persistence operations

It defines how your app’s data behaves and is stored.

It does not know about UI or business decisions.

---

## It May:

* Use the database package (sinkro-db)
* Be called by `app/`
* Be called by sync engine

---

## It Must NOT:

* Render UI
* Enforce high-level business workflows
* Call external SDKs directly

---

## Questions to Ask

* Is this about storing or retrieving core data?
* Is this about how records are merged or persisted?
* Is this about how entities relate at the storage level?

If yes → `domain/`