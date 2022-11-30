![logo](logo.svg)

A ~100LoC **safe** [Beyond](https://www.johnmacfarlane.net/beyond-markdown.html) [Markdown](https://spec.commonmark.org/)
to [`NodeList`](https://developer.mozilla.org/en-US/docs/Web/API/NodeList) parser.

## Usage

```usage.ts
import md2dom from "./md2dom.js";

const Md = new md2dom()
myDiv.replaceChildren(...Md.parse("Hi *me* !"));
```

## Limitation

This parser favor simplicity and safety over backward compatibility.

- all HTML tags (`<script>`, `<!-- ...`) are rendered as plain text.
- blockquote use the same block syntax (`>>>` and `<<<`) as block of code

## Demo

See: [live rendering](//yne.fr/md2dom)

### Inline elements

| render             | code                 |
| ------             | ----                 |
| *strong*           | `*strong*`           |
| _emphasis_         | `_emphasis_`         |
| ~~strike~~         | `~~strike~~`         |
| {=mark=}           | `{=mark=}`           |
| {-del-}            | `{-del-}`            |
| {+ins+}            | `{+ins+}`            |
| ~sub~              | `~sub~`              |
| ^sup^              | `^sup^`              |
| :+1:               | `:+1:`               |
| `code`             | `` `code` ``         |
| <ftp://user@x.y/z> | `<ftp://user@x.y/z>` |
| <user@mail.com>    | `<user@mail.com>`    |
| [my link](url)     | `[my link](url)`     |
| ![logo](logo.svg)  | `![logo](logo.svg)`  |
| [![linked logo](logo.svg)](url) | `[![linked logo](logo.svg)](url)` |

### Block elements

#### Code

To format code into its own distinct block, use the triple ``` syntax.

```prng.c
int getRandomNumber() {
  return 4; // chosen by fair dice roll
}
```

#### Quote

To format quote into its own distinct block, use the triple `>` syntax.

>>>info:
this is an info blockquote with some CSS style
  >>>>warning:
  this is a nested warning with optional (but welcome) indent
  >>>>
back to the info level
>>>

#### Table

Same as markdown, but with stricter syntax: all rows must *start* and *end* with a `|`.

|A 1 cell table|

If a separator/align line is found, all it preceding lines become `th`

|Default Header | Left Header | Center Header | Right Header |
|-------        | :----       | :------:      | -----:       |
|Default        | Left        | Center        | Right        |

#### List

- first list item
- same list item

- new list because of new paragraph
* new list because of type changes
+ new list because of type changes again

5. numerated list starting at 5
2. next entry is simply incremented 

- unnumbered nesting example
  - two space is 1 indent
    -  even deeper
    -  continued
  - back to level 2
- the end

1. number nesting
    1. dive two level directly
    1. dive two level directly
      1. we need to go deeper
      2. we need to go deeper
      1. we need to go deeper
    3. dive two level directly
  1. back to skiped level 2
1. back to level 1
  
