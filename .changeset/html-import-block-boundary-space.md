---
'lexical': patch
'@lexical/html': patch
---

[fix] HTML import trims a space at the start or end of a block when the block sits next to an inline tag, or when a block is nested inside one. This applies to any inline tag, including long-standing ones such as `<span>`, `<b>`, `<i>` and `<a>`: for example, `<div><p>a </p><span>b</span></div>` now imports as `a` / `b` instead of `a ` / `b`. The inline tags #9744 added, such as `<font>` and `<strike>`, made the bug easy to hit.

Verify: HTML import with `$generateNodesFromDOM` or the extension import pipeline; the whitespace walks that decide whether an edge space follows or precedes text on the same line now stop at a block element instead of climbing out of it or descending into it. With the extension pipeline, an element the `ImportWhitespaceConfig` `isInline` override marks inline is not a stop.
