<img src=.github/logo.svg width=100% height=200>

# Safe Markdown to DOM Elements

A ~1KB safe [Markdown](github.github.com/gfm/)-[ish](#Limitation)
to [Element](https://developer.mozilla.org/en-US/docs/Web/API/element).

## Usage

```ts
import md from "./md2dom.js";
const nodeList = md("Basic *example* !");
const outputEl = document.getElementById('preview');
outputEl.replaceChildren(...nodeList);
```

See: [demo.html](demo.html)

## Limitation

- no inline HTML support: unsuported by design
- no alternativ header declaration using `===` or `---` : conflict with horizontal rules
- no 4 spaces or tab for code block: conflict with (non-standard but usefull) nested list
- no block element (header, separator, ...) in blockquote: Low usage / need recursion
- no trailing `#` in header: Low usage
- no title in img/link, a (ex: `![alt](url "title")`): Low usage
- no double backtick code: Low usage
