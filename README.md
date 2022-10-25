<img src=.github/logo.svg width=100% height=200>

# Markdown to Elements

A ~1KB safe [Markdown](github.github.com/gfm/)-[ish](#Limitation)
to [NodeList](https://developer.mozilla.org/en-US/docs/Web/API/NodeList).

## Usage

```ts
import md from "./md2dom.js";
const nodeList = md("Basic *example* !");
const outputEl = document.getElementById('preview');
outputEl.replaceChildren(...nodeList);
```

See: [demo.html](demo.html)

## Limitation

See: [gfm.html](gfm.html)

- no inline HTML support: unsuported by design
- no alternativ header declaration using `===` or `---` : conflict with horizontal rules
- no title in img/link, a (ex: `![alt](url "title")`): Low usage
