---
'@lexical/table': patch
---

[fix] A table selection on a cell whose row span reaches past the table's last row (left by a remote update or imported JSON) no longer throws, so the cell can be selected, copied and deleted

Verify: tables whose cells' row spans can reach past the last row when the table transform did not run; `$computeTableCellRectBoundary` now returns a `maxRow` no larger than the table map's last row.
