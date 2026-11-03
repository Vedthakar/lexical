/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {
  $createTextNode,
  $getRoot,
  $removeSlot,
  $setSlot,
  defineExtension,
  type LexicalEditor,
} from 'lexical';
import {afterEach, describe, expect, test} from 'vitest';

import {$createTestElementNode, TestElementNode} from '../utils';

// #9758: a slot value moved out of its slot into a new element in the same
// update must not take the new element's DOM down with the old slot container.

const roots: HTMLElement[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) {
    root.remove();
  }
});

function createEditor(): LexicalEditorWithDispose {
  const editor = buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: () => {
        $getRoot().clear();
      },
      name: '[slot-move]',
      nodes: [TestElementNode],
    }),
  );
  const root = document.createElement('div');
  root.contentEditable = 'true';
  document.body.appendChild(root);
  roots.push(root);
  editor.setRootElement(root);
  return editor;
}

function freshHTML(editor: LexicalEditor): string {
  using fresh = createEditor();
  fresh.setEditorState(
    fresh.parseEditorState(JSON.stringify(editor.getEditorState().toJSON())),
  );
  return fresh.getRootElement()!.innerHTML;
}

type Move = 'append' | 'slot';

function run(move: Move, removeHost: boolean, after: boolean) {
  using editor = createEditor();
  let aKey = '';
  let bKey = '';
  editor.update(
    () => {
      const a = $createTestElementNode();
      const b = $createTestElementNode().append($createTextNode('moved'));
      $setSlot(a, 'body', b);
      // When the host is removed, nest it so the root creates the new element
      // before the host's parent is reconciled and the host destroyed.
      $getRoot()
        .clear()
        .append(
          removeHost ? $createTestElementNode().append(a) : a,
          $createTestElementNode().append($createTextNode('tail')),
        );
      aKey = a.getKey();
      bKey = b.getKey();
    },
    {discrete: true},
  );
  const oldContainer = editor.getElementByKey(bKey)!.parentElement!;
  expect(oldContainer.getAttribute('data-lexical-slot')).toBe('body');

  editor.update(
    () => {
      const a = editor.getEditorState()._nodeMap.get(aKey) as TestElementNode;
      const liveA = a.getLatest();
      const b = editor.getEditorState()._nodeMap.get(bKey) as TestElementNode;
      $removeSlot(liveA, 'body');
      const c = $createTestElementNode();
      if (move === 'append') {
        c.append(b.getLatest());
      } else {
        $setSlot(c, 'body', b.getLatest());
      }
      const anchor = removeHost ? liveA.getParentOrThrow() : liveA;
      if (after) {
        anchor.insertAfter(c);
      } else {
        anchor.insertBefore(c);
      }
      if (removeHost) {
        liveA.remove();
      }
    },
    {discrete: true},
  );

  const root = editor.getRootElement()!;
  expect(root.textContent).toContain('moved');
  expect(root.innerHTML).toBe(freshHTML(editor));
  expect(oldContainer.isConnected).toBe(false);
}

describe('LexicalReconciler: slot value moved into a new element (#9758)', () => {
  for (const move of ['append', 'slot'] as const) {
    for (const after of [false, true]) {
      const where = after ? 'after' : 'before';
      test(`value moved by ${move} into a new element ${where} the host`, () =>
        run(move, false, after));
      test(`value moved by ${move} into a new element ${where} the host, host removed`, () =>
        run(move, true, after));
    }
  }
});
