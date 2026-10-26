/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {buildEditorFromExtensions} from '@lexical/extension';
import {$isListItemNode, $isListNode, type ListNode} from '@lexical/list';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  CHECK_LIST,
  createListTransformers,
  ORDERED_LIST,
  type Transformer,
  TRANSFORMERS,
  UNORDERED_LIST,
} from '@lexical/markdown';
import {$getRoot, type LexicalNode} from 'lexical';
import {describe, expect, it} from 'vitest';

import {MarkdownTestExtension} from '../utils';

function withListTransformers(indentSize?: number): Transformer[] {
  const lists = createListTransformers(
    indentSize === undefined ? undefined : {indentSize},
  );
  return TRANSFORMERS.map(t =>
    t === UNORDERED_LIST
      ? lists.UNORDERED_LIST
      : t === ORDERED_LIST
        ? lists.ORDERED_LIST
        : t === CHECK_LIST
          ? lists.CHECK_LIST
          : t,
  );
}

/** Each list item's text, prefixed by two dots per nesting level. */
function $outline(node: LexicalNode, depth = 0): string[] {
  if (!$isListNode(node)) {
    return [];
  }
  return (node as ListNode).getChildren().flatMap(item => {
    if (!$isListItemNode(item)) {
      return [];
    }
    const first = item.getFirstChild();
    if (item.getChildrenSize() === 1 && $isListNode(first)) {
      return $outline(first, depth + 1);
    }
    return ['..'.repeat(depth) + item.getTextContent()];
  });
}

function convert(
  markdown: string,
  importWith: Transformer[],
  exportWith: Transformer[] = importWith,
): {outline: string[]; markdown: string} {
  using editor = buildEditorFromExtensions([MarkdownTestExtension]);
  let result = {markdown: '', outline: [] as string[]};
  editor.update(
    () => {
      $convertFromMarkdownString(markdown, importWith);
      result = {
        markdown: $convertToMarkdownString(exportWith),
        outline: $getRoot()
          .getChildren()
          .flatMap(n => $outline(n)),
      };
    },
    {discrete: true},
  );
  return result;
}

describe('createListTransformers indentSize (#2213)', () => {
  const nested4 = '- a\n    - b\n        - c\n- d';
  const nested2 = '- a\n  - b\n    - c\n- d';
  const outline = ['a', '..b', '....c', 'd'];

  it('exports nested lists with 4 spaces by default', () => {
    expect(convert(nested4, TRANSFORMERS)).toEqual({
      markdown: nested4,
      outline,
    });
    expect(convert(nested4, withListTransformers())).toEqual({
      markdown: nested4,
      outline,
    });
  });

  it('exports nested lists with the configured indent size', () => {
    expect(
      convert(nested4, TRANSFORMERS, withListTransformers(2)).markdown,
    ).toBe(nested2);
  });

  it('round-trips 2-space nested lists at indent size 2', () => {
    expect(convert(nested2, withListTransformers(2))).toEqual({
      markdown: nested2,
      outline,
    });
  });

  it('round-trips 2-space nested ordered and check lists at indent size 2', () => {
    const ordered = '1. a\n  1. b\n    1. c\n2. d';
    expect(convert(ordered, withListTransformers(2))).toEqual({
      markdown: ordered,
      outline,
    });
    const check = '- [ ] a\n  - [x] b\n    - [ ] c\n- [ ] d';
    // `TRANSFORMERS` has no check list transformer, so put it ahead of the
    // bullet one.
    const withCheck = [
      createListTransformers({indentSize: 2}).CHECK_LIST,
      ...withListTransformers(2),
    ];
    expect(convert(check, withCheck)).toEqual({
      markdown: check,
      outline,
    });
  });

  it('rejects an indent size that is not a positive integer', () => {
    for (const indentSize of [0, -2, 1.5, NaN, Infinity]) {
      expect(() => createListTransformers({indentSize})).toThrow(
        'createListTransformers: indentSize must be a positive integer',
      );
    }
  });
});
