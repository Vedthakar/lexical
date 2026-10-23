/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import type {TextFormatType} from 'lexical';

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

type Run = [text: string, formats: TextFormatType[]];

function exportRuns(runs: Run[]): string {
  using editor = buildEditorFromExtensions([MarkdownTestExtension]);
  editor.update(
    () => {
      const paragraph = $createParagraphNode();
      for (const [text, formats] of runs) {
        const node = $createTextNode(text);
        for (const format of formats) {
          node.toggleFormat(format);
        }
        paragraph.append(node);
      }
      $getRoot().clear().append(paragraph);
    },
    {discrete: true},
  );
  return editor.read(() => $convertToMarkdownString(TRANSFORMERS));
}

function importRuns(markdown: string): Run[] {
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
      .map(node => [
        node.getTextContent(),
        (['bold', 'italic', 'strikethrough'] as const).filter(f =>
          node.hasFormat(f),
        ),
      ]);
  });
}

describe('nested emphasis on export (#9443)', () => {
  it.each<[Run[], string]>([
    [
      [
        ['Disclaimer', ['bold', 'italic']],
        [': once accepted.', ['italic']],
      ],
      '***Disclaimer**: once accepted.*',
    ],
    [
      [
        ['Disclaimer', ['bold', 'italic']],
        [': once accepted.', ['bold']],
      ],
      '***Disclaimer*: once accepted.**',
    ],
    [
      [
        ['a', ['bold', 'italic', 'strikethrough']],
        [' b', ['italic', 'strikethrough']],
        [' c', ['strikethrough']],
      ],
      '~~***a** b* c~~',
    ],
    [
      [
        ['Hello ', ['bold', 'strikethrough']],
        ['world', ['bold', 'italic', 'strikethrough']],
        ['!', ['strikethrough']],
      ],
      '~~**Hello *world***!~~',
    ],
    [
      // control: both formats end together
      [['a b', ['bold', 'italic']]],
      '***a b***',
    ],
  ])('exports %j as %s and imports it back', (runs, expected) => {
    const markdown = exportRuns(runs);
    expect(markdown).toBe(expected);
    expect(importRuns(markdown)).toEqual(
      runs.map(([text, formats]) => [
        text,
        (['bold', 'italic', 'strikethrough'] as const).filter(f =>
          formats.includes(f),
        ),
      ]),
    );
  });

  it('round-trips the markdown from the issue', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(
      () =>
        $convertFromMarkdownString(
          '***Disclaimer**: once accepted.*',
          TRANSFORMERS,
        ),
      {discrete: true},
    );
    expect(editor.read(() => $convertToMarkdownString(TRANSFORMERS))).toBe(
      '***Disclaimer**: once accepted.*',
    );
  });
});
