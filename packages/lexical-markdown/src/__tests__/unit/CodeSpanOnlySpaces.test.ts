/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from '@lexical/markdown';
import {$getRoot, $isElementNode, $isTextNode} from 'lexical';
import {describe, expect, it} from 'vitest';

import {MarkdownTestExtension} from '../utils';

function roundTrip(markdown: string): string {
  using editor = buildEditorFromExtensions([MarkdownTestExtension]);
  editor.update(() => $convertFromMarkdownString(markdown, TRANSFORMERS), {
    discrete: true,
  });
  return editor.read(() => $convertToMarkdownString(TRANSFORMERS));
}

/** The text and formats of each text node in the first paragraph. */
function importInline(markdown: string): string[] {
  using editor = buildEditorFromExtensions([MarkdownTestExtension]);
  editor.update(() => $convertFromMarkdownString(markdown, TRANSFORMERS), {
    discrete: true,
  });
  return editor.read(() => {
    const first = $getRoot().getFirstChild();
    if (!$isElementNode(first)) {
      return [];
    }
    return first
      .getChildren()
      .filter($isTextNode)
      .map(node =>
        [
          JSON.stringify(node.getTextContent()),
          ...(['bold', 'italic', 'code'] as const).filter(f =>
            node.hasFormat(f),
          ),
        ].join(' '),
      );
  });
}

describe('code spans of only spaces (#9405)', () => {
  it.each([
    '` `',
    '`  `',
    'a ` ` b',
    '**` `**',
    '*` `* x',
    // Controls: these round-trip on main too.
    '`a`',
    '`  a  `',
    '**`a`** b',
    '`` ` ``',
  ])('round-trips %j unchanged, and again', markdown => {
    const once = roundTrip(markdown);
    expect(once).toBe(markdown);
    expect(roundTrip(once)).toBe(markdown);
  });

  it('keeps the content of a code span of only spaces', () => {
    expect(importInline('a ` ` b')).toEqual(['"a "', '" " code', '" b"']);
    expect(importInline(roundTrip('a ` ` b'))).toEqual([
      '"a "',
      '" " code',
      '" b"',
    ]);
  });

  it('keeps bold around a code span of only spaces', () => {
    expect(importInline(roundTrip('**` `**'))).toEqual(['" " bold code']);
  });

  it('still drops a padding space from `` ` a ` `` on export', () => {
    expect(roundTrip('` a `')).toBe('`a`');
  });
});
