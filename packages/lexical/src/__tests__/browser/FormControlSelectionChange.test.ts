/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
} from 'lexical';
import {assert, describe, expect, onTestFinished, test} from 'vitest';

function settle(ms = 50): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('form-control selectionchange', () => {
  test.each(['input', 'textarea'] as const)(
    'ignores a selectionchange from an unfocused %s',
    async tagName => {
      const container = document.createElement('div');
      const contentEditable = document.createElement('div');
      contentEditable.contentEditable = 'true';
      const control = document.createElement(tagName);
      control.value = 'initial';
      container.append(contentEditable, control);
      document.body.appendChild(container);

      const editor = buildEditorFromExtensions({
        dependencies: [RichTextExtension],
        name: 'form-control-selectionchange',
      });
      editor.setRootElement(contentEditable);
      const readFormat = () =>
        editor.read(() => {
          const selection = $getSelection();
          assert($isRangeSelection(selection));
          return selection.format;
        });
      onTestFinished(() => {
        editor.setRootElement(null);
        editor.dispose();
        container.remove();
      });

      editor.update(
        () => {
          const text = $createTextNode('hello');
          $getRoot().clear().append($createParagraphNode().append(text));
          text.selectEnd();
        },
        {discrete: true},
      );
      await settle();
      editor.update(
        () => {
          const selection = $getSelection();
          assert($isRangeSelection(selection));
          selection.formatText('bold');
        },
        {discrete: true},
      );
      // Outlast the collapsed-format grace period. The document selection is
      // still at the end of the unformatted text, ready to insert bold text.
      await settle(250);
      expect(readFormat()).toBe(1);
      expect(document.activeElement).toBe(contentEditable);

      let controlSelectionChanges = 0;
      control.addEventListener(
        'selectionchange',
        () => controlSelectionChanges++,
      );
      control.value = 'updated value';
      await settle();
      expect(controlSelectionChanges).toBeGreaterThan(0);
      expect(readFormat()).toBe(1);

      editor.update(
        () => {
          const selection = $getSelection();
          assert($isRangeSelection(selection));
          selection.insertText('B');
        },
        {discrete: true},
      );
      expect(contentEditable.textContent).toBe('helloB');
      expect(contentEditable.querySelector('strong')?.textContent).toBe('B');
      await settle();

      // A genuine document selection change must still update the editor.
      const textNode = contentEditable.querySelector('span')?.firstChild;
      assert(textNode);
      document.getSelection()!.setBaseAndExtent(textNode, 2, textNode, 2);
      await settle();
      expect(
        editor.read(() => {
          const selection = $getSelection();
          assert($isRangeSelection(selection));
          return {format: selection.format, offset: selection.anchor.offset};
        }),
      ).toEqual({format: 0, offset: 2});
    },
  );
});
