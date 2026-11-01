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
  $getRoot,
  $isElementNode,
  type EditorConfig,
  type ElementDOMSlot,
  ElementNode,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';
import {
  $createTestDecoratorNode,
  TestDecoratorNode,
} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, test} from 'vitest';

// A shadow root whose DOM has a header before its children and a footer
// after them, marked as the slot's boundaries (#9680).
class FramedNode extends ElementNode {
  $config() {
    return this.config('test_framed', {extends: ElementNode});
  }
  isShadowRoot(): boolean {
    return true;
  }
  createDOM(_config: EditorConfig): HTMLElement {
    const div = document.createElement('div');
    const header = document.createElement('header');
    const footer = document.createElement('footer');
    header.contentEditable = 'false';
    footer.contentEditable = 'false';
    div.append(header, footer);
    return div;
  }
  updateDOM(): boolean {
    return false;
  }
  getDOMSlot(element: HTMLElement): ElementDOMSlot<HTMLElement> {
    return super
      .getDOMSlot(element)
      .withAfter(element.querySelector(':scope > header'))
      .withBefore(element.querySelector(':scope > footer'));
  }
}

function createEditor(framed: boolean) {
  const editor = buildEditorFromExtensions({
    $initialEditorState: () => {
      const decorators = [
        $createTestDecoratorNode().setIsInline(false),
        $createTestDecoratorNode().setIsInline(false),
      ];
      $getRoot()
        .clear()
        .append(
          ...(framed ? [new FramedNode().append(...decorators)] : decorators),
        );
    },
    dependencies: [RichTextExtension],
    name: 'test',
    nodes: [TestDecoratorNode, FramedNode],
  });
  const rootElement = document.createElement('div');
  rootElement.contentEditable = 'true';
  document.body.appendChild(rootElement);
  editor.setRootElement(rootElement);
  rootElement.focus();
  return editor;
}

function $container(framed: boolean): ElementNode {
  const root = $getRoot();
  if (!framed) {
    return root;
  }
  const node: LexicalNode | null = root.getFirstChild();
  assert($isElementNode(node));
  return node;
}

/** The block cursor's neighbours in its parent, by tag name. */
function placeCursor(
  editor: LexicalEditor,
  framed: boolean,
  atEnd: boolean,
): {prev: string | null; next: string | null; parent: string | null} {
  editor.update(
    () => {
      const container = $container(framed);
      const offset = atEnd ? container.getChildrenSize() : 0;
      container.select(offset, offset);
    },
    {discrete: true},
  );
  const cursor = editor._blockCursorElement;
  assert(cursor !== null, 'no block cursor');
  const name = (node: Node | null): string | null => {
    // Skip zero-size selection scaffolding (decorator boundary anchors).
    while (
      node !== null &&
      node instanceof HTMLElement &&
      node.tagName === 'SPAN' &&
      node.textContent === ''
    ) {
      node = atEnd ? node.previousSibling : node.nextSibling;
    }
    return node instanceof HTMLElement
      ? node.tagName.toLowerCase() +
          (node.dataset.lexicalDecorator === 'true' ? '[decorator]' : '')
      : node === null
        ? null
        : '#' + node.nodeName;
  };
  return {
    next: name(cursor.nextSibling),
    parent: cursor.parentElement && cursor.parentElement.tagName.toLowerCase(),
    prev: name(cursor.previousSibling),
  };
}

describe('block cursor inside a DOMSlot with before/after boundaries (#9680)', () => {
  test('after the last decorator, the cursor goes right before the footer', () => {
    using editor = createEditor(true);
    const {next, parent} = placeCursor(editor, true, true);
    expect(parent).toBe('div');
    expect(next).toBe('footer');
  });

  test('before the first decorator, the cursor goes after the header', () => {
    using editor = createEditor(true);
    const {prev, next} = placeCursor(editor, true, false);
    expect(next).toBe('div[decorator]');
    expect(prev).not.toBe('footer');
    const cursor = editor._blockCursorElement!;
    const header = cursor.parentElement!.querySelector(':scope > header')!;
    expect(
      header.compareDocumentPosition(cursor) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test('without a slot, the cursor is still the last child at the end', () => {
    using editor = createEditor(false);
    const {next} = placeCursor(editor, false, true);
    expect(next).toBe(null);
  });
});
