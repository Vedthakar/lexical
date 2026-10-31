---
'@lexical/selection': patch
---

[fix] `$wrapNodes` returns, instead of never finishing, for a range across a horizontal rule (or another block decorator) inside a block element that is not a container; the decorator is wrapped on its own, as it is at the root
