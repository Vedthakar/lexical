---
'lexical': patch
---

[fix] Moving a named slot's value into a new element in the same update (with `$removeSlot`, or by removing the slot host) no longer removes the new element's DOM; the reconciler removes the old slot container instead

Verify: editors that use the experimental named slots; slot containers are now looked up through their host's DOM by slot name, not through the slotted value's current `parentElement`.
