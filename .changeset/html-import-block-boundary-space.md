---
'lexical': patch
'@lexical/html': patch
---

[fix] HTML import trims a space at the start or end of a block again when the block sits next to an inline tag such as `<font>` or `<strike>`, or when a block is nested inside one

Verify: HTML import with `$generateNodesFromDOM` or the extension import pipeline; the whitespace walks that decide whether an edge space follows or precedes text on the same line now stop at a block element instead of climbing out of it or descending into it. With the extension pipeline, an element the `ImportWhitespaceConfig` `isInline` override marks inline is not a stop.
