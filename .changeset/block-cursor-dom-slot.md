---
'lexical': patch
---

[fix] The block cursor at the end of an element whose `getDOMSlot` sets a `before` boundary (`withBefore`) is placed before that boundary, inside the slot, instead of after it

Verify: custom nodes whose `getDOMSlot` uses `withBefore` and hold block decorators; the block cursor after the last decorator is now inside the slot, before the boundary element.
