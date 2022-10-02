/* Architecture:
We use a 3-level pass strategy:
- section element (code, blockquote) (ol, ul?)
- block element (h1..h6, hr, ol, ul)
- inline element (a, em, strong)

Issues:
- too much paragraph (every lines)
- no list unstacking
*/
const text = document.createTextNode.bind(document);
const elem = (tag, props = {}, ch = []) => ch.reduce((e, c) => (e.appendChild(c), e), Object.assign(document.createElement(tag), props))

function inline_parse(e, txt) {
	const inline_rules = [
		[/\*([^\*]+?)\*/g, (e, m) => inline_parse(e.appendChild(elem("strong")), m[1])],
		[/_([^_]+?)_/g, (e, m) => inline_parse(e.appendChild(elem("em")), m[1])],
		[/~([^~]+?)~/g, (e, m) => inline_parse(e.appendChild(elem("strike")), m[1])],
		[/`([^`]+?)`/g, (e, m) => inline_parse(e.appendChild(elem("code")), m[1])],
		[/\[\s*!\[(.*?)\]\((.+?)\)\s*\]\((.+?)\)/g, (e, m) => (e.appendChild(elem("a", { href: m[3] }, [elem("img", { alt: m[1], src: m[2] })])), m[1])],
		[/\[\s*(.*?)\s*\]\((.+?)\)/g, (e, m) => inline_parse(e.appendChild(elem("a", { href: m[2] })), m[1])],
		[/!\[\s*(.*?)\s*\]\((.+?)\)/g, (e, m) => (e.appendChild(elem("img", { alt: m[1], src: m[2] })), m[1])],
		[/  $/g, (e) => e.appendChild(elem("br"))] // shall be in block ? we want <br> in <h> ?
	];
	let pos = 0;
	const matches = inline_rules.map(([re, cb]) => [...txt.matchAll(re)].map(m => [cb, m])).flat().sort((a, b) => a[1].index - b[1].index);
	for (let [cb, m] of matches) {
		if (m.index < pos) { continue; } // skip already matched 
		e.appendChild(text(txt.slice(pos, m.index)));
		pos = m.index + m[0].length;
		cb(e, m);
	}
	e.appendChild(text(txt.slice(pos)));
	return e;
};

function block_parse(es, line) {
	function list(e, [_, indent, li], ctor, tag) {
		while (e[indent.length >> 1]?.constructor !== ctor)
			e.unshift(e[0].appendChild(elem(tag)))
		inline_parse(e[0].appendChild(elem("li")), li)
	}
	const block_rules = [ // TODO: order by occuring frequency
		[/^\s*$/, (e) => { while (e.length > 1) e.shift() }],
		[/^---+$/, ([e]) => e.appendChild(elem("hr"))],
		[/^# (.*)/, ([e], m) => inline_parse(e.appendChild(elem("h1")), m[1])],
		[/^## (.*)/, ([e], m) => inline_parse(e.appendChild(elem("h2")), m[1])],
		[/^### (.*)/, ([e], m) => inline_parse(e.appendChild(elem("h3")), m[1])],
		[/^#### (.*)/, ([e], m) => inline_parse(e.appendChild(elem("h4")), m[1])],
		[/^##### (.*)/, ([e], m) => inline_parse(e.appendChild(elem("h5")), m[1])],
		[/^###### (.*)/, ([e], m) => inline_parse(e.appendChild(elem("h6")), m[1])],
		// TODO: move the following as section rule ?
		[/^(\s*)[-\*] (.*)/, (e, m) => list(e, m, HTMLUListElement, "ul")],
		[/^(\s*)\d+\. (.*)/, (e, m) => list(e, m, HTMLOListElement, "ol")],
		[/^> *(.*)/, (e, m) => {
			if (e[0].constructor != HTMLQuoteElement)
				e.unshift(e[0].appendChild(elem("blockquote")));
			inline_parse(e[0], m[1]);
		}],
	];
	for (const [re, cb] of block_rules) {
		const m = line.match(re);
		if (!m) continue;
		cb(es, m);
		return es;
	}
	inline_parse(es[0].appendChild(elem("p")), line); // not a block line => try inline
	return es;
}

export default function section_parse(markdown) {
	let stack = [elem('template')];
	const lines = markdown.split(/\n/);
	let state = { code: false, quote: false, table: false, list: 0 };
	for (let line of lines) {
		let m = line.match(/^```(\w*)$/);
		let s = line.match(/^    /); // code
		let q = line.match(/^\s*>/); // quote
		if (m) {
			state.code = !state.code;
			if (state.code) { // open <code> section
				stack.unshift(stack[0].appendChild(elem("pre")));
				stack.unshift(stack[0].appendChild(elem("code", { lang: m[1] })));
			} else { // close <code> section
				stack.shift();
				stack.shift();
			}
		} else if (state.code) { // no change while in code => append text
			stack[0].appendChild(text(line + '\n'));
		} else {
			stack = block_parse(stack, line); // nothing and no <p> ? go into <p>
		}
	}
	return stack[0].childNodes;
}