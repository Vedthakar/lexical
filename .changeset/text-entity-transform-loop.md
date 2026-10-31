---
'@lexical/text': patch
---

[fix] `registerLexicalTextEntity` no longer loops forever when a plain text node between two text nodes it can't merge with (such as bold ones) starts with a match that the previous node's last letter invalidates
