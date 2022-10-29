<img src="./.logo.svg" width=100% height=200>

# Markdown to Elements

A ~100LoC **safe** [Markdown](https://spec.commonmark.org/)+[GFM](https://github.github.com/gfm/)
to [`NodeList`](https://developer.mozilla.org/en-US/docs/Web/API/NodeList) parser with [Limitation](#Limitation)

## Usage

```ts
import parse from "./md2dom.js";

myElement.replaceChildren(...parse("Hello *world* !"));
```

See: [demo.html](demo.html)

## Limitation

All HTML tags (including `<!-- comment -->`, `<script>`, `<a>` ...) are rendered **as text**.

See `unsupported` in [gfm.html](gfm.html) for a complete list of non-compliances.
