---
'@lexical/text': patch
---

[fix] `registerLexicalTextEntity` no longer loops forever when a plain text node between two text nodes it can't merge with (such as bold ones) starts with a match that the previous node's last letter invalidates

Verify: typing in plain text that sits between two simple text nodes it can't merge with (such as bold ones), next to text entities (hashtags, keywords). Where the update used to throw, an entity at the start of the plain text node, right after a node ending in a letter, now stays plain. Nothing changes when the previous node is in token or segmented mode, or in shapes that did not loop.
