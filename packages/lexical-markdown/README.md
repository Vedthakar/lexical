# `@lexical/markdown`

[![See API Documentation](https://lexical.dev/img/see-api-documentation.svg)](https://lexical.dev/docs/api/modules/lexical_markdown)

This package contains markdown helpers for Lexical: import, export and shortcuts.

## Import and export
```js
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from '@lexical/markdown';

editor.update(() => {
  const markdown = $convertToMarkdownString(TRANSFORMERS);
  ...
});

editor.update(() => {
  $convertFromMarkdownString(markdown, TRANSFORMERS);
});
```

It can also be used for initializing editor's state from markdown string. Here's an example with react `<RichTextPlugin>`
```jsx
<LexicalComposer initialConfig={{
  editorState: () => $convertFromMarkdownString(markdown, TRANSFORMERS)
}}>
  <RichTextPlugin />
</LexicalComposer>
```

## Shortcuts
Can use `<MarkdownShortcutPlugin>` if using React
```jsx
import { TRANSFORMERS } from '@lexical/markdown';
import {MarkdownShortcutPlugin} from '@lexical/react/LexicalMarkdownShortcutPlugin';

<LexicalComposer>
  <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
</LexicalComposer>
```

Or `registerMarkdownShortcuts` to register it manually:
```js
import {
  registerMarkdownShortcuts,
  TRANSFORMERS,
} from '@lexical/markdown';

const editor = createEditor(...);
registerMarkdownShortcuts(editor, TRANSFORMERS);
```

## Transformers
Markdown functionality relies on transformers configuration. It's an array of objects that define how certain text or nodes
are processed during import, export or while typing. `@lexical/markdown` package provides set of built-in transformers:
```js
// Element transformers
UNORDERED_LIST
CODE
HEADING
ORDERED_LIST
QUOTE

// Text format transformers
BOLD_ITALIC_STAR
BOLD_ITALIC_UNDERSCORE
BOLD_STAR
BOLD_UNDERSCORE
INLINE_CODE
ITALIC_STAR
ITALIC_UNDERSCORE
STRIKETHROUGH

// Text match transformers
LINK
```

And bundles of commonly used transformers:
- `TRANSFORMERS` - all built-in transformers
- `ELEMENT_TRANSFORMERS` - all built-in element transformers
- `MULTILINE_ELEMENT_TRANSFORMERS` - all built-in multiline element transformers
- `TEXT_FORMAT_TRANSFORMERS` - all built-in text format transformers
- `TEXT_MATCH_TRANSFORMERS` - all built-in text match transformers

Transformers are explicitly passed to markdown API allowing application-specific subset of markdown or custom transformers.

The list transformers indent nested lists by 4 spaces per level. To use a different
indent size (a positive integer), create them with `createListTransformers` and use
them in place of `UNORDERED_LIST`, `ORDERED_LIST` and `CHECK_LIST`:

```js
import {
  $convertToMarkdownString,
  createListTransformers,
  ORDERED_LIST,
  TRANSFORMERS,
  UNORDERED_LIST,
} from '@lexical/markdown';

const lists = createListTransformers({indentSize: 2});
// `TRANSFORMERS` has no check list transformer, so add `lists.CHECK_LIST`
// ahead of the bullet one to import and export check lists too.
const MY_TRANSFORMERS = [
  lists.CHECK_LIST,
  ...TRANSFORMERS.map((transformer) =>
    transformer === UNORDERED_LIST
      ? lists.UNORDERED_LIST
      : transformer === ORDERED_LIST
        ? lists.ORDERED_LIST
        : transformer,
  ),
];

editor.update(() => {
  // "- a\n  - b" rather than "- a\n    - b"
  const markdown = $convertToMarkdownString(MY_TRANSFORMERS);
});
```

There're three types of transformers:

- **Element transformer** handles top level elements (lists, headings, quotes, tables or code blocks)
- **Text format transformer** applies text range formats defined in `TextFormatType` (bold, italic, underline, strikethrough, code, subscript and superscript)
- **Text match transformer** relies on matching leaf text node content

See `MarkdownTransformers.js` for transformer implementation examples
