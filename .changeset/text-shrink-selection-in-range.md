---
'lexical': patch
---

[fix] `TextNode.spliceText` (without `moveSelection`) and `TextNode.setTextContent` keep a selection point on the node inside its new text, so a shrink no longer commits a selection past the end of the node and a later `splitText` no longer throws in development

Verify: code that calls `spliceText` without `moveSelection`, or `setTextContent`, on a node a `RangeSelection` point is on. After `spliceText`, a point after the changed range shifts by the change in length, a point inside the deleted range moves to its start, and a point at a pure insertion stays where it was. After `setTextContent`, a point past the new end moves to the end. `spliceText(…, true)` is unchanged.
