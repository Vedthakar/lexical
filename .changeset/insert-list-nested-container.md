---
'@lexical/list': patch
---

[fix] With node structure enforced, `$insertList` on a paragraph inside a block container that is not a shadow root turns that paragraph into a list in place and keeps the containers, instead of dropping the outer container and making no list
