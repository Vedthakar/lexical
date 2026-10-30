/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  click,
  E2E_BROWSER,
  expect,
  focusEditor,
  initialize,
  selectFromInsertDropdown,
  test,
} from '../utils/index.mjs';

// Playwright launches Chromium with `--hide-scrollbars`, so the page never
// has a layout-affecting scrollbar. Drop that flag so the page gets classic
// (always-visible) scrollbars, which is where a scroll lock that hides the
// scrollbar shifts the layout sideways (#7856).
test.use({
  launchOptions: {
    ignoreDefaultArgs: ['--hide-scrollbars'],
    slowMo: Number(process.env.E2E_SLOW_MO ?? 50),
  },
});

test.skip(
  ({isPlainText, isCollab}) =>
    isPlainText || isCollab || E2E_BROWSER !== 'chromium',
  'Requires rich text and Chromium with classic scrollbars',
);

async function makePageScrollable(page) {
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Enter');
  }
  const scrollbarWidth = await page.evaluate(
    () => window.innerWidth - document.documentElement.clientWidth,
  );
  expect(scrollbarWidth).toBeGreaterThan(0);
}

function editorLeft(page) {
  return page
    .locator('div[contenteditable="true"]')
    .first()
    .evaluate(el => el.getBoundingClientRect().left);
}

test.describe('Scrollbar shift', () => {
  test.describe('DateTime picker', () => {
    test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

    test('Opening the date picker does not shift the page sideways', async ({
      page,
    }) => {
      await focusEditor(page);
      await selectFromInsertDropdown(page, '.item .calendar');
      await makePageScrollable(page);
      const before = await editorLeft(page);
      await click(page, '.dateTimePill');
      await expect(page.locator('.dateTimePicker')).toBeVisible();
      expect(await editorLeft(page)).toBe(before);
    });
  });

  test.describe('Context menu', () => {
    test.use({shouldUseLexicalContextMenu: true});
    test.beforeEach(({isCollab, page, shouldUseLexicalContextMenu}) =>
      initialize({isCollab, page, shouldUseLexicalContextMenu}),
    );

    test('Opening the context menu does not shift the page sideways', async ({
      page,
    }) => {
      await focusEditor(page);
      await page.keyboard.type('hello');
      await makePageScrollable(page);
      const before = await editorLeft(page);
      await click(page, 'div[contenteditable="true"] span', {button: 'right'});
      await expect(
        page
          .locator('.PlaygroundEditorTheme__contextMenu')
          .getByRole('menuitem')
          .first(),
      ).toBeVisible();
      expect(await editorLeft(page)).toBe(before);
    });
  });
});
