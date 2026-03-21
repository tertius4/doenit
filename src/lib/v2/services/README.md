# 📁 `services/`

## Role

External system adapters.

This layer wraps:

* Billing
* Filesystem
* Notifications
* Firestore
* OS integrations
* Third-party SDKs

Services are technical bridges.

They return results, but they do not decide what those results mean.

---

## It May:

* Talk to platform APIs or external SDKs
* Be called by `app/`

---

## It Must NOT:

* Contain business rules
* Modify domain state directly
* Render UI

---

## Questions to Ask

* Does this talk to something outside the app?
* Would swapping this for another provider change nothing else?
* Is this purely technical integration code?

If yes → `services/`
