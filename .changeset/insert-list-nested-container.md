---
'@lexical/list': patch
---

[fix] With node structure enforced, `$insertList` on paragraphs nested inside two or more block containers (not shadow roots) turns each selected paragraph into a list in place and keeps the containers, instead of dropping the outer container and making no list

Verify: with `NodeStructureExtension` (or `INTERNAL_isNodeStructureEnforced`), the tree after `$insertList` on paragraphs nested two or more block containers deep, including selections that span a nested paragraph and a sibling paragraph in the same top-level container.
