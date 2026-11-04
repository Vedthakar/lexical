/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $generateJSONFromSelectedNodes,
  $getClipboardDataFromSelection,
} from '@lexical/clipboard';
import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $createTableSelectionFrom,
  $isTableCellNode,
  $isTableNode,
  TableExtension,
  type TableRowNode,
} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $setSelection,
  configExtension,
  defineExtension,
  KEY_DELETE_COMMAND,
  type LexicalEditor,
} from 'lexical';
import {assert, expect, test} from 'vitest';

// A table built without the table transform (as a remote update applies it),
// where a cell's row span reaches past the last row (#9759). Cells are their text, or [text, colSpan, rowSpan].
type Spec = (string | [string, number, number])[][];

function build(rows: Spec) {
  const editor = buildEditorFromExtensions(
    defineExtension({
      afterRegistration(ed) {
        // The table selection observer, which handles the commands below,
        // needs the editor to have a root element.
        const root = document.createElement('div');
        document.body.append(root);
        ed.setRootElement(root);
        return () => root.remove();
      },
      dependencies: [configExtension(TableExtension, {hasNestedTables: true})],
      name: '[table-selection-row-span-past-last-row]',
      // Lexical clipboard data pastes into an editor of the same namespace.
      namespace: 'table-selection-row-span-past-last-row',
      onError: (error: Error) => {
        throw error;
      },
      theme: {
        tableCellSelected: 'selected',
        tableScrollableWrapper: 'table-scrollable-wrapper',
      },
    }),
  );
  editor.update(
    () => {
      const table = $createTableNode();
      for (const specs of rows) {
        const row = $createTableRowNode();
        for (const spec of specs) {
          const [text, colSpan, rowSpan] =
            typeof spec === 'string' ? [spec, 1, 1] : spec;
          row.append(
            $createTableCellNode()
              .setColSpan(colSpan)
              .setRowSpan(rowSpan)
              .append($createParagraphNode().append($createTextNode(text))),
          );
        }
        table.append(row);
      }
      $getRoot().clear().append(table, $createParagraphNode());
    },
    {discrete: true, skipTransforms: true},
  );
  return editor;
}

function $table() {
  const table = $getRoot().getChildren().find($isTableNode);
  assert(table !== undefined, 'expected a table');
  return table;
}

function $cell(name: string) {
  const cell = $table()
    .getChildren()
    .flatMap(row => (row as TableRowNode).getChildren())
    .find(node => node.getTextContent() === name);
  assert($isTableCellNode(cell), `expected a cell ${name}`);
  return cell;
}

function selectBig(editor: LexicalEditor) {
  editor.update(
    () =>
      $setSelection(
        $createTableSelectionFrom($table(), $cell('BIG'), $cell('BIG')),
      ),
    {discrete: true},
  );
}

// Four rows; the first holds one cell spanning 5 columns and 5 rows.
const SPEC: Spec = [[['BIG', 5, 5]], [], [], []];

test('a table selection on a cell whose row span reaches past the last row holds the cell', () => {
  using editor = build(SPEC);
  selectBig(editor);
  editor.read(() => {
    expect(
      $getSelection()!
        .getNodes()
        .filter($isTableCellNode)
        .map(c => c.getTextContent()),
    ).toEqual(['BIG']);
  });
});

test('copying that selection does not throw', () => {
  using editor = build(SPEC);
  selectBig(editor);
  editor.read(() => {
    const data = $getClipboardDataFromSelection($getSelection()!);
    expect(data['text/html']).toContain('BIG');
    const json = $generateJSONFromSelectedNodes(editor, $getSelection()!);
    expect(JSON.stringify(json.nodes)).toContain('BIG');
  });
});

test('deleting that selection does not throw and removes the cell', () => {
  using editor = build(SPEC);
  selectBig(editor);
  editor.update(
    () => {
      editor.dispatchCommand(KEY_DELETE_COMMAND, new KeyboardEvent('keydown'));
    },
    {discrete: true},
  );
  // The cell covers the whole table, so the whole table is selected, and
  // deleting it removes the table, as for any fully selected table.
  editor.read(() => {
    expect($getRoot().getTextContent()).not.toContain('BIG');
  });
});
