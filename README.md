![logo](logo.svg)

# Markdown to Elements

A ~100LoC **safe** [Beyond](https://www.johnmacfarlane.net/beyond-markdown.html) [Markdown](https://spec.commonmark.org/)
to [`NodeList`](https://developer.mozilla.org/en-US/docs/Web/API/NodeList) parser.

## Usage

```ts
import md2dom from "./md2dom.js";

const nodes = (new md2dom()).parse("Hi *me* !")
myElement.replaceChildren(...nodes);
```

See: [demo.html](demo.html)

## Limitation

This parser favor simplicity and safety over backward compatibility.

- all HTML tags (`<script>`, `<!-- ...`) are rendered as plain text.
- blockquote use same syntax as block of code
