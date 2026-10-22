/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {$isCodeNode} from '@lexical/code-core';
import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from '@lexical/markdown';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isTextNode,
} from 'lexical';
import {describe, expect, it} from 'vitest';

import {MarkdownTestExtension} from '../utils';

/** Each top-level block as `type:text`, with inline code shown as `[code]`. */
function importBlocks(markdown: string): string[] {
  using editor = buildEditorFromExtensions([MarkdownTestExtension]);
  editor.update(() => $convertFromMarkdownString(markdown, TRANSFORMERS), {
    discrete: true,
  });
  return editor.read(() =>
    $getRoot()
      .getChildren()
      .map(block => {
        if ($isCodeNode(block) || !$isElementNode(block)) {
          return `${block.getType()}:${block.getTextContent()}`;
        }
        const text = block
          .getChildren()
          .map(child =>
            $isTextNode(child) && child.hasFormat('code')
              ? `[${child.getTextContent()}]`
              : child.getTextContent(),
          )
          .join('');
        return `${block.getType()}:${text}`;
      }),
  );
}

/** Export a paragraph of inline `code` then `text`, and import it again. */
function roundTripInlineCode(code: string, text: string): string[] {
  using editor = buildEditorFromExtensions([MarkdownTestExtension]);
  editor.update(
    () => {
      const paragraph = $createParagraphNode().append(
        $createTextNode(code).toggleFormat('code'),
      );
      if (text) {
        paragraph.append($createTextNode(text));
      }
      $getRoot().clear().append(paragraph);
    },
    {discrete: true},
  );
  return importBlocks(
    editor.read(() => $convertToMarkdownString(TRANSFORMERS)),
  );
}

describe('a line starting with backticks that has more later (#9404)', () => {
  it.each([
    ['a``b', ' x'],
    ['```', ' x'],
    ['a``b', ''],
  ])('keeps inline code %j + %j a paragraph on round trip', (code, text) => {
    expect(roundTripInlineCode(code, text)).toEqual([
      `paragraph:[${code}]${text}`,
    ]);
  });

  it('imports a code span at the start of a line as a paragraph', () => {
    expect(importBlocks('```` ``` ```` x\n\nnext')).toEqual([
      'paragraph:[```] x',
      'paragraph:next',
    ]);
  });

  it('does not read a closing run shorter than the fence as a code block', () => {
    expect(importBlocks('````a```\n\nnext')).toEqual([
      'paragraph:````a```',
      'paragraph:next',
    ]);
  });

  // Controls: fences and the single-line form import as before.
  it.each([
    ['```Single line Code```', ['code:Single line Code']],
    ['```a```', ['code:a']],
    ['```js\ncode\n```', ['code:code']],
    ['```js title="x"\ncode\n```', ['code:code']],
    ['````\n```\ninner\n```\n````', ['code:```\ninner\n```']],
    ['```\ncode\n```\n\nnext', ['code:code', 'paragraph:next']],
    ['`` `a` `` x', ['paragraph:[`a`] x']],
  ])('still imports %j as before', (markdown, blocks) => {
    expect(importBlocks(markdown)).toEqual(blocks);
  });
});
