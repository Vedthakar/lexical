---
'@lexical/text': patch
---

[fix] `registerLexicalTextEntity` no longer loops forever when a plain text node between two text nodes it can't merge with (such as bold ones) starts with a match that the previous node's last letter invalidates

Verify: typing in plain text that sits between two differently formatted text nodes next to text entities (hashtags, keywords); an entity at the start of the plain text node, right after a node ending in a letter, is no longer converted there, where the update used to throw.
