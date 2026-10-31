/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {
  $createHorizontalRuleNode,
  buildEditorFromExtensions,
  HorizontalRuleExtension,
} from '@lexical/extension';
import {$createQuoteNode, QuoteNode} from '@lexical/rich-text';
import {$wrapNodes} from '@lexical/selection';
import {
  $create,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isTextNode,
  $setSelection,
  defineExtension,
  ElementNode,
  type LexicalNode,
} from 'lexical';
import {expect, test} from 'vitest';

// A plain block element that holds blocks, with no declared structure.
class BoxNode extends ElementNode {
  $config() {
    return this.config('repro_box', {extends: ElementNode});
  }
}

const shapeOf = (n: LexicalNode): string =>
  $isElementNode(n)
    ? `${n.getType()}(${n.getChildren().map(shapeOf).join(' ')})`
    : $isTextNode(n)
      ? JSON.stringify(n.getTextContent())
      : n.getType();

function wrapAcrossRule(inBox: boolean): string {
  using editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [HorizontalRuleExtension],
      name: 'repro',
      nodes: [BoxNode, QuoteNode],
    }),
  );
  editor.update(
    () => {
      const bb = $createTextNode('bb');
      const cc = $createTextNode('cc');
      const blocks = [
        $createParagraphNode().append($createTextNode('aa')),
        $createParagraphNode().append(bb),
        $createHorizontalRuleNode(),
        $createParagraphNode().append(cc),
      ];
      $getRoot()
        .clear()
        .append(...(inBox ? [$create(BoxNode).append(...blocks)] : blocks));
      const selection = $createRangeSelection();
      selection.anchor.set(bb.getKey(), 1, 'text');
      selection.focus.set(cc.getKey(), 2, 'text');
      $setSelection(selection);
      $wrapNodes(selection, () => $createQuoteNode());
    },
    {discrete: true},
  );
  return editor.read(() => $getRoot().getChildren().map(shapeOf).join(' '));
}

test('#9638 $wrapNodes over a range across a horizontal rule in a box returns and keeps every block', () => {
  expect(wrapAcrossRule(true)).toBe(
    'repro_box(paragraph("aa") quote("bb") quote(horizontalrule) quote("cc"))',
  );
});

test('control: the same range at the root wraps the rule the same way', () => {
  expect(wrapAcrossRule(false)).toBe(
    'paragraph("aa") quote("bb") quote(horizontalrule) quote("cc")',
  );
});
