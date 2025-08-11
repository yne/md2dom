//@ts-check
/**
 * @template {keyof HTMLElementTagNameMap} T
 * @param {T} tagName
 * @param {Partial<HTMLElementTagNameMap[T]>} props
 * @param {(Node|String)[]} ch
 * @param {{[key: string]: string}} attr
 * @returns {HTMLElementTagNameMap[T]}
 */
function el(tagName, props = {}, ch = [], attr = {}) {
	const e = Object.assign(document.createElement(tagName), Object.fromEntries(Object.entries(props).filter(([_, v]) => v !== undefined)));
	for (const c of ch) e.append(c);
	for (const a in attr) e.setAttribute(a, attr[a])
	return e;
}
export default class {
	prefix = ""
	emojis = /**@type {Record<string,string>}*/({ "+1": "👍" })
	headers = /**@type {(keyof HTMLElementTagNameMap)[]}*/(["h1", "h2", "h3", "h4", "h5", "h6"])
	inline_rules = /**@type {{when:RegExp,open:(e:HTMLElement,m:string[])=>HTMLElement}[]}*/([
		{ //! strong text is surrounded with a single `*`or `_` character or a `{*` and `*}` if in middle of a word
			when: /\{\*(.+?)\*\}|\b__(.+?)__\b|(?<![\w*])\*\*(.+?)\*\*(?![\w*])/g,
			open: (e, m) => this.inline(m[1] || m[2] || m[3], e.appendChild(el("strong")))
		}, {  //! emphasis text is surrounded with a double `*`or `_` character or a `{_` and `_}` if in middle of a word
			when: /\{_(.+?)_\}|\b_([^_]+?)_\b|(?<![\w*])\*([^*]+?)\*(?![\w*])/g,
			open: (e, m) => this.inline(m[1] || m[2] || m[3], e.appendChild(el("em")))
		}, { //! highlighted text is surrounded with `{=` and `=}`
			when: /\{=(.+?)=\}/g,
			open: (e, m) => this.inline(m[1] || m[2], e.appendChild(el("mark")))
		}, { //! striked text is surrounded with `{~` and `~}` double tild `~~`
			when: /\{~(.+?)~\}|(?<![\w~])~~(.+?)~~(?![\w~])/g,
			open: (e, m) => this.inline(m[1] || m[2], e.appendChild(el("s")))
		}, { //! inserted text is surrounded with a `{+` and `+}` character
			when: /\{\+(.+?)\+\}/g,
			open: (e, m) => this.inline(m[1], e.appendChild(el("ins")))
		}, { //! deleted text is surrounded with a `{-` and `-}` character
			when: /\{-(.+?)-\}/g,
			open: (e, m) => this.inline(m[1], e.appendChild(el("del")))
		}, { //! sup text is surrounded with a `^` character
			when: /\{\^(.+?)\^\}|(?<![\w^])\^(.+?)\^(?![\w^])/g,
			open: (e, m) => this.inline(m[1] || m[2], e.appendChild(el("sup")))
		}, { //! sub text is surrounded with a `~` character
			when: /(?<![\w~])~(.+?)~(?![\w~])/g,
			open: (e, [_, md]) => this.inline(md, e.appendChild(el("sub")))
		}, { //! smiley is surrounded with a `:` character
			when: /:(.+?):/g,
			open: (e, [_, id]) => { e.append(id in this.emojis ? el("span", { title: id }, [this.emojis[id]]) : _); return id }
		}, { //! code text is surrounded with a `` ` ``, or 2 if needed because text already contain a single backtick
			when: /(`{1,2})(.+?)\1/g,
			open: (e, [_, ticks, code]) => { e.appendChild(el("code", {}, [code])); return ticks }
		}, { // manual a+img rule to avoid balanced regexp on link item
			when: /\[\s*!\[(.*?)\]\((.+?)\)\s*\]\((.+?)\)/g,
			open: (e, [_, alt, src, href]) => { e.appendChild(el("a", { href }, [el("img", { alt, src })])); return alt }
		}, { //! named link starts with it name inside brackets, followed by it address inside parenthesis
			when: /\[(.*?)\]\((.+?)\)/g,
			open: (e, [_, md, href]) => this.inline(md, e.appendChild(el("a", { href })))
		}, { //! link is surrounded with `<` and `>`, mail addresses are converted to `mailto:` uri
			when: /<(.+?)>/g,
			open: (e, [_, href]) => e.appendChild(el("a", { href: ((href.match('@') && !href.match('//')) ? 'mailto:' : '') + href }, [href]))
		}, { //! image starts with a `!` followed by it alt-name inside brackets, followed by it address inside parenthesis
			when: /!\[\s*(.*?)\s*\]\((.+?)\)/g,
			open: (e, [_, alt, src]) => { e.appendChild(el("img", { alt, src })); return alt }
		},
	]);
	block_rules = /**@type {{when:RegExp,open:(...matches:string[])=>HTMLElement[]}[]}*/([
		{   //! Thematic break lines are composed of at least 3 `-` or `*` characters than can each have spaces before or after them
			when: /^ *(-|\*)(?: *\1){2,} *(?:$|\n)/,
			open: () => [el('hr'), el('p')],// add a <p> since it can't accept continuation lines
		}, { //! headers lines starts with 1 to 6 `#` followed by a space, followed by the title
			when: /^(#{1,6})[ \t]+(.+?)(?:$|\n)/,
			open: (_, hash, header) => [this.inline(header, el(this.headers[hash.length - 1] || 'h6', { id: this.prefix + header.toLowerCase().replaceAll(/[^-\s\p{L}\p{M}\p{N}]/gu, '').replaceAll(/[-\s]+/g, '-') }))]
		}, { //! code blocks starts with at least 3 backtick followed by an optional code language and must end with the equivalent number of backtick
			when: /^(`{3,})(.*)\n([\S\s]*?)\n\1(?:$|\n)/,
			open: (_, _lv, lang, body) => [el('pre', {}, [el('code', { lang }, [body])])],
		}, { //! citations blocks starts with a `>`
			when: /^(?: *>)((?:(?! *\||#{1,6}[ \t]| *\d\. | *[\*\+\-]).+(?:$|\n))+)/,
			open: (_, quote) => { console.log(quote); return [this.inline(quote.replaceAll(/(?:\n|^) *>/g, ''), el('blockquote'))] },
		}, { //! tables lines starts and end with a `|`, a line can be a separator line `|:---:|`, otherwise it's a data line; separator prefixed line become headers
			when: /^ *(?:\|.+\|(?:$|\n))+/,
			open: (_) => {
				const trs = _.split(/\n/).slice(0, -1).map(row => ({ sep: row.match(/\| *?:?-+:? */), data: row.split('|').slice(1, -1) }));
				const [h, align] = [trs.findIndex(tr => tr.sep), (trs.find(tr => tr.sep) || { data: [] }).data.map(str => [{}, { align: (str.match(/:-/) ? 'left' : 'right') }, { align: 'center' }][(str.match(/:/g) || []).length])];
				return [el('table', {}, trs.filter(tr => !tr.sep).map((tr, n) => el('tr', {}, tr.data.map((td, i) => this.inline(td, el(n < h ? 'th' : 'td', align[i]))))))];
			},
		}, { //! unordered lists items line starts with possibl indented `*`, `+` or `-` followed by lines that does not start with #,|,-
			when: /^( *?)([-+*] |\d+\. ).*(?:(?:$|\n)\1(?:\2| +).*)*/, // TODO: accept multiple number (stop using line.startsWith)
			open: (_, _lv, _type) => [el(isNaN(+_type)?'ul':'ol', isNaN(+_type)?{}:{start:+_type}, _.split('\n')
				.map(line => line.startsWith(_lv + _type) ? this.inline(line.slice((_lv + _type).length), el('li')) : line)
				.map((li, i, all) => (typeof li != "string" || typeof all[i + 1] != "string") ? li : (all[i + 1] = li + '\n' + all[i + 1], undefined))
				.filter(e => e !== undefined).map(li => typeof li == "string" ? [...this.parse(li)] : li).flat())],
		}, { //! any group of text line generate a new paragraph
			when: /^((?:(?! *\||#{1,6}[ \t]| *\d\. | *>| *[\*\+\-]).+(?:$|\n))+)/,
			open: (_) => [this.inline(_.trim(), el('p'))]
		}, { //! catch all the rest
			when: /^.*(?:$|\n)/,
			open: (_) => [this.inline(_.trim(), el('s'))]
		}
	]);
	constructor(options = {}) {
		Object.assign(this, { newline: true, compact: true, prefix: '' }, options);
	}
	/**@param {string} line @param {HTMLElement} parent */
	inline(line, parent) {
		let pos = 0;
		const rules = this.inline_rules.map(({ when, open }) => [...line.matchAll(when)].map(match => ({ open, match }))).flat().sort((a, b) => a.match.index - b.match.index);
		for (let { open, match } of rules) {
			if (match.index < pos) continue; // skip already matched
			parent.appendChild(new Text(line.slice(pos, match.index)));
			pos = match.index + match[0].length;
			open(parent, match);
		}
		parent.appendChild(new Text(line.slice(pos)));
		return parent;
	};
	/**@param {string} lines*/
	parse(lines) {
		const parent = el('template', {}, []);
		while (lines) for (const block_rule of this.block_rules) {
			const parts = lines.match(block_rule.when);
			if (!parts) continue;
			parent.append(...block_rule.open(...parts)); // this.compact
			lines = lines.slice(parts[0].length);
			break; // stop at first matched block rule
		}
		parent.querySelectorAll(':scope>p:empty').forEach(ch => parent.removeChild(ch));
		return parent.childNodes;
	}
}