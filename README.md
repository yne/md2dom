![logo](logo.svg)

# Markdown to Elements

A ~100LoC **safe** [Beyond](https://www.johnmacfarlane.net/beyond-markdown.html) [Markdown](https://spec.commonmark.org/)
to [`NodeList`](https://developer.mozilla.org/en-US/docs/Web/API/NodeList) parser.

## Usage

```ts
import md2dom from "./md2dom.js";

myElement.replaceChildren(...(new md2dom()).parse("Hello *world* !"));
```

See: [demo.html](demo.html)

## Limitation

This parser favor simplicity and safety over backward compatibility.

- all HTML tags (including `<!-- comment -->`, `<script>`, `<a>` ...) are rendered as text.
- no list nesting (for now) as I can't figure a clean/stateless way to do it