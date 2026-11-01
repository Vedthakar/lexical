---
'lexical': patch
---

[fix] The block cursor at the end of an element whose `getDOMSlot` sets a `before` boundary (`withBefore`) is placed before that boundary, inside the slot, instead of after it
