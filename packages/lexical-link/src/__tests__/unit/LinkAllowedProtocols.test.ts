/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {$createLinkNode, LinkExtension, type LinkNode} from '@lexical/link';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  configExtension,
} from 'lexical';
import {describe, expect, test} from 'vitest';

const OBSIDIAN = 'obsidian://open?vault=notes&file=todo';
// eslint-disable-next-line no-script-url
const JAVASCRIPT = 'javascript:alert(0)';

function buildEditor(allowedProtocols?: readonly string[]) {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        configExtension(
          LinkExtension,
          allowedProtocols === undefined ? {} : {allowedProtocols},
        ),
      ],
      name: '[root-allowed-protocols]',
    }),
  );
}

/** The `href` each URL gets when rendered as a link in `editor` */
function renderedHrefs(
  editor: ReturnType<typeof buildEditor>,
  urls: string[],
): string[] {
  const root = document.createElement('div');
  editor.setRootElement(root);
  editor.update(
    () => {
      const paragraph = $createParagraphNode();
      for (const url of urls) {
        paragraph.append($createLinkNode(url).append($createTextNode(url)));
      }
      $getRoot().clear().append(paragraph);
    },
    {discrete: true},
  );
  return Array.from(root.querySelectorAll('a'), a => a.getAttribute('href')!);
}

// https://github.com/facebook/lexical/issues/4353
describe('LinkExtension allowedProtocols', () => {
  test('by default, only the built-in protocols are allowed', () => {
    using editor = buildEditor();
    expect(
      renderedHrefs(editor, ['https://lexical.dev', OBSIDIAN, JAVASCRIPT]),
    ).toEqual(['https://lexical.dev', 'about:blank', 'about:blank']);
  });

  test('a configured custom protocol is kept', () => {
    using editor = buildEditor(['https:', 'Obsidian']);
    expect(
      renderedHrefs(editor, ['https://lexical.dev', OBSIDIAN, 'OBSIDIAN://x']),
    ).toEqual(['https://lexical.dev', OBSIDIAN, 'OBSIDIAN://x']);
  });

  test('the configured list replaces the default one', () => {
    using editor = buildEditor(['obsidian:']);
    expect(
      renderedHrefs(editor, [OBSIDIAN, 'https://lexical.dev', JAVASCRIPT]),
    ).toEqual([OBSIDIAN, 'about:blank', 'about:blank']);
  });

  test('javascript, data and vbscript protocols stay blocked even when listed', () => {
    // eslint-disable-next-line no-script-url
    using editor = buildEditor(['https:', 'javascript:', 'DATA', 'vbscript:']);
    expect(
      renderedHrefs(editor, [
        JAVASCRIPT,
        'data:text/html,<script>alert(1)</script>',
        'VBScript:msgbox(1)',
        'https://lexical.dev',
      ]),
    ).toEqual([
      'about:blank',
      'about:blank',
      'about:blank',
      'https://lexical.dev',
    ]);
  });

  test('unparseable URLs still fail closed for unlisted protocols', () => {
    using editor = buildEditor(['obsidian:']);
    editor.update(
      () => {
        const link = $createLinkNode('');
        expect(link.sanitizeUrl('java\x00script://:99999/%0aalert(1)')).toBe(
          'about:blank',
        );
        expect(link.sanitizeUrl('obsidian://:99999/x')).toBe(
          'obsidian://:99999/x',
        );
      },
      {discrete: true},
    );
  });

  test('outside of an editor update, the default protocols are used', () => {
    using editor = buildEditor(['obsidian:']);
    let link: LinkNode | undefined;
    editor.update(
      () => {
        link = $createLinkNode('');
      },
      {discrete: true},
    );
    expect(link!.sanitizeUrl(OBSIDIAN)).toBe('about:blank');
    expect(link!.sanitizeUrl('https://lexical.dev')).toBe(
      'https://lexical.dev',
    );
  });
});
