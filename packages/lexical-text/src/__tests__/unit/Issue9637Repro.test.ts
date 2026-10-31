/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {registerLexicalTextEntity} from '@lexical/text';
import {
  $create,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $setSelection,
  createEditor,
  type ElementNode,
  TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

class KeywordNode extends TextNode {
  $config() {
    return this.config('test-keyword', {extends: TextNode});
  }
  isTextEntity(): true {
    return true;
  }
  canInsertTextBefore(): boolean {
    return false;
  }
  canInsertTextAfter(): boolean {
    return false;
  }
}

const KEYWORD = /(^|[^a-z#])(cat|dog)(?=[^a-z]|$)/;

function typeInto(
  texts: string[],
  index: number,
  offset: number,
  typed: string,
): string {
  const editor = createEditor({
    nodes: [KeywordNode],
    onError: e => {
      throw e;
    },
  });
  registerLexicalTextEntity(
    editor,
    text => {
      const m = KEYWORD.exec(text);
      return m === null
        ? null
        : {
            end: m.index + m[1].length + m[2].length,
            start: m.index + m[1].length,
          };
    },
    KeywordNode,
    node => $create(KeywordNode).setTextContent(node.getTextContent()),
  );
  editor.update(
    () => {
      $getRoot().append(
        $createParagraphNode().append(
          ...texts.map(t => {
            const node = $createTextNode(t.replace(/^\*/, ''));
            return t.startsWith('*') ? node.toggleFormat('bold') : node;
          }),
        ),
      );
    },
    {discrete: true},
  );
  editor.update(
    () => {
      const node = (
        $getRoot().getFirstChildOrThrow() as ElementNode
      ).getChildAtIndex(index) as TextNode;
      const sel = $createRangeSelection();
      sel.anchor.set(node.getKey(), offset, 'text');
      sel.focus.set(node.getKey(), offset, 'text');
      $setSelection(sel);
      sel.insertText(typed);
    },
    {discrete: true},
  );
  return editor.getEditorState().read(() =>
    ($getRoot().getFirstChildOrThrow() as ElementNode)
      .getChildren()
      .map(
        n =>
          `${n.getType()}${(n as TextNode).hasFormat('bold') ? '*' : ''}:${JSON.stringify(n.getTextContent())}`,
      )
      .join(' '),
  );
}

// Cases from @zurfyx's report in #9637.
describe('#9637 text entity transforms between two formatted neighbours', () => {
  test('bold "x" | "dogcat" | bold "y", type a space after "dog"', () => {
    expect(typeInto(['*x', 'dogcat', '*y'], 1, 3, ' ')).toBe(
      'text*:"x" text:"dog cat" text*:"y"',
    );
  });
  test('bold "x" | "dogcat" | bold "dog", type an emoji after "dog"', () => {
    expect(typeInto(['*x', 'dogcat', '*dog'], 1, 3, '😀')).toBe(
      'text*:"x" text:"dog😀cat" text*:"dog"',
    );
  });
  test('bold "x" | "dogcat" (nothing after), type a space after "dog"', () => {
    // Left-only shape: "dog" stays plain next to "x" and "cat" becomes an
    // entity, the same as on main (the loop needs a neighbour on both sides).
    expect(typeInto(['*x', 'dogcat'], 1, 3, ' ')).toBe(
      'text*:"x" text:"dog " test-keyword:"cat"',
    );
  });
  // Controls: these settle on main.
  test('control: "dogcat" | bold "y" (nothing before), type a space', () => {
    expect(typeInto(['dogcat', '*y'], 0, 3, ' ')).toBe(
      'test-keyword:"dog" text:" cat" text*:"y"',
    );
  });
  test('control: bold " " | "dogcat" | bold "y", type a space', () => {
    expect(typeInto(['* ', 'dogcat', '*y'], 1, 3, ' ')).toBe(
      'text*:" " test-keyword:"dog" text:" cat" text*:"y"',
    );
  });
});
