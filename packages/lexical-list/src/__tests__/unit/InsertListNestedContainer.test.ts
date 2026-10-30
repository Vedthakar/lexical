/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  NodeStructureExtension,
} from '@lexical/extension';
import {$insertList, ListExtension} from '@lexical/list';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  defineExtension,
  ElementNode,
  type LexicalNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

// A block container that is not a shadow root (like a callout).
class BoxNode extends ElementNode {
  $config() {
    return this.config('test_box', {extends: ElementNode});
  }
  createDOM(): HTMLElement {
    return document.createElement('div');
  }
  updateDOM(): boolean {
    return false;
  }
}

const shapeOf = (n: LexicalNode): string =>
  n instanceof ElementNode
    ? `${n.getType()}(${n.getChildren().map(shapeOf).join(' ')})`
    : JSON.stringify(n.getTextContent());

function insertListIn(
  structure: boolean,
  wrap: (paragraph: ElementNode) => ElementNode,
): string {
  const editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        RichTextExtension,
        ListExtension,
        ...(structure ? [NodeStructureExtension] : []),
      ],
      name: '[root]',
      nodes: () => [BoxNode],
      onError: (e: Error) => {
        throw e;
      },
    }),
  );
  editor.update(
    () => {
      const text = $createTextNode('abc');
      $getRoot()
        .clear()
        .append(wrap($createParagraphNode().append(text)));
      text.select(1, 1);
      $insertList('bullet');
    },
    {discrete: true},
  );
  return editor.read(() => $getRoot().getChildren().map(shapeOf).join(' / '));
}

describe('$insertList on a paragraph inside a block container (#9570)', () => {
  const $nested = (p: ElementNode) =>
    $create(BoxNode).append($create(BoxNode).append(p));
  const $single = (p: ElementNode) => $create(BoxNode).append(p);

  test('with NodeStructureExtension, nested boxes are kept', () => {
    expect(insertListIn(true, $nested)).toBe(
      'test_box(test_box(list(listitem("abc"))))',
    );
  });

  test('with NodeStructureExtension, a single box behaves as before', () => {
    // As on main: the box is replaced by the list, and the paragraph's text
    // becomes the item's content.
    expect(insertListIn(true, $single)).toBe('list(listitem("abc"))');
  });

  test('without NodeStructureExtension, the behaviour is unchanged', () => {
    expect(insertListIn(false, $nested)).toBe(
      'list(listitem(test_box(paragraph("abc"))))',
    );
    expect(insertListIn(false, $single)).toBe(
      'list(listitem(paragraph("abc")))',
    );
  });

  test('a paragraph at the root still becomes a list', () => {
    expect(insertListIn(true, p => p)).toBe('list(listitem("abc"))');
    expect(insertListIn(false, p => p)).toBe('list(listitem("abc"))');
  });
});
