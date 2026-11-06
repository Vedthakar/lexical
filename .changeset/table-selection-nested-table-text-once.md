---
'@lexical/table': patch
---

[fix] TableSelection.getTextContent (the text/plain of a copy or cut of a table selection) writes the text of a table nested in a selected cell once, instead of repeating it as extra cells

Verify: in a table, put a nested table with text in one cell, select cells of the outer table including that one, and copy. The pasted plain text holds the nested table's text once, inside that cell's text, and the outer table's rows and tabs are unchanged.
