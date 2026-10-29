/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  type ParagraphNode,
  RootNode,
  type TextNode,
} from 'lexical';
import {expect, test, vi} from 'vitest';

function createHeadlessEditor() {
  const editor = createEditor({
    onError: e => {
      throw e;
    },
  });
  editor.update(
    () => {
      for (let i = 0; i < 10000; i++) {
        $getRoot().append(
          $createParagraphNode().append(
            $createTextNode(`para ${i} lorem ipsum`),
          ),
        );
      }
    },
    {discrete: true},
  );
  return editor;
}

test('a one-character edit in a headless editor does not compute the whole document text', () => {
  const editor = createHeadlessEditor();
  // No text content listener is registered.
  expect(editor._listeners.textcontent.size).toBe(0);
  const spy = vi.spyOn(RootNode.prototype, 'getTextContent');
  for (let i = 0; i < 20; i++) {
    editor.update(
      () => {
        const text = (
          $getRoot().getChildAtIndex(i * 401) as ParagraphNode
        ).getFirstDescendant() as TextNode;
        text.setTextContent('x' + text.getTextContent());
      },
      {discrete: true},
    );
  }
  const calls = spy.mock.calls.length;
  spy.mockRestore();
  expect(calls).toBe(0);
});

test('a text content listener is still called when the text changes', () => {
  const editor = createHeadlessEditor();
  const listener = vi.fn();
  editor.registerTextContentListener(listener);
  editor.update(
    () => {
      const text = (
        $getRoot().getFirstChild() as ParagraphNode
      ).getFirstDescendant() as TextNode;
      text.setTextContent('x' + text.getTextContent());
    },
    {discrete: true},
  );
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener.mock.calls[0][0]).toMatch(/^xpara 0 lorem ipsum\n\npara 1/);
});
