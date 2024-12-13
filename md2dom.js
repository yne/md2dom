const elem = (tag, props = {}, ch = []) => ch.reduce((e, c) => (e.appendChild(c), e), Object.assign(document.createElement(tag), props))
export default class {
	inline_rules = [
		{ //! a strong text is surrounded with a `*` character or a `{*` and `*}` if disambiguation is necessary
			when: /\{\*(.+?)\*\}|__(.+?)__|\*\*(.+?)\*\*/g,
			open: (e, m) => this.inline(m[1] || m[2] || m[3], e.appendChild(elem("strong")))
		}, {  //! an emphasis text is surrounded with a `_` character or a `{_` and `_}` if disambiguation is necessary
			when: /\{_(.+?)_\}|_(.+?)_|\*(.+?)\*/g,
			open: (e, m) => this.inline(m[1] || m[2] || m[3], e.appendChild(elem("em")))
		}, { //! a highlighted text is surrounded with `{=` and `=}`
			when: /\{=(.+?)=\}/g,
			open: (e, m) => this.inline(m[1] || m[2], e.appendChild(elem("mark")))
		}, { //! a highlighted text is surrounded with `{=` and `=}`
			when: /~~(.+?)~~/g,
			open: (e, m) => this.inline(m[1] || m[2], e.appendChild(elem("s")))
		}, { //! a ins text is surrounded with a `{+` and `+}` character
			when: /\{\+(.+?)\+\}/g,
			open: (e, m) => this.inline(m[1], e.appendChild(elem("ins")))
		}, { //! a del text is surrounded with a `{-` and `-}` character
			when: /\{-(.+?)-\}/g,
			open: (e, m) => this.inline(m[1], e.appendChild(elem("del")))
		}, { //! a sup text is surrounded with a `^` character
			when: /\^(.+?)\^/g,
			open: (e, m) => this.inline(m[1], e.appendChild(elem("sup")))
		}, { //! a sub text is surrounded with a `~` character
			when: /~(.+?)~/g,
			open: (e, m) => this.inline(m[1], e.appendChild(elem("sub")))
		}, { //! a smiley text is surrounded with a `:` character
			when: /:(.+?):/g,
			open: (e, m) => (e.appendChild((this.emojis || [])[m[1]] ? elem("span", { title: m[1] }, [new Text(this.emojis[m[1]])]) : new Text(m[1])), m[1])
		}, { //! a code text is surrounded with a `` ` ``, or 2 if needed because text already contain a single backtick 
			when: /(`{1,2})(.+?)\1/g,
			open: (e, m) => (e.appendChild(elem("code", {}, [new Text(m[2])])), m[1])
		}, { // manual a+img rule to avoid balanced regexp on link item
			when: /\[\s*!\[(.*?)\]\((.+?)\)\s*\]\((.+?)\)/g,
			open: (e, m) => (e.appendChild(elem("a", { href: m[3] }, [elem("img", { alt: m[1], src: m[2] })])), m[1])
		}, { //! a named link starts with it name inside brackets, followed by it address inside parenthesis
			when: /\[(.*?)\]\((.+?)\)/g,
			open: (e, m) => this.inline(m[1], e.appendChild(elem("a", { href: m[2] })))
		}, { //! a link is surrounded with `<` and `>`, mail addresses are converted to `mailto:` uri
			when: /<(.+?)>/g,
			open: (e, m) => e.appendChild(elem("a", { href: ((m[1].match('@') && !m[1].match('//')) ? 'mailto:' : '') + m[1] }, [new Text(m[1])]))
		}, { //! an image starts with a `!` followed by it alt-name inside brackets, followed by it address inside parenthesis
			when: /!\[\s*(.*?)\s*\]\((.+?)\)/g,
			open: (e, m) => (e.appendChild(elem("img", { alt: m[1], src: m[2] })), m[1])
		},
	];
	block_rules = [
		{	//! Thematic break lines are composed of at least 3 `-` or `*` characters than can each have spaces before or after them
			when: /^ *(-|\*)(?: *\1){2,} *\n/,
			open: () => [elem('hr'), elem('p')],// add a <p> since it can't accept continuation lines
		}, { //! headers lines starts with 1 to 6 `#` followed by a space, followed by the title
			when: /^(#{1,6})[ \t]+(.+?)\n/,
			open: (_, { length }, header) => [this.inline(header, elem(`h${length}`, { id: this.prefix + header.toLowerCase().replaceAll(/[^-\s\p{L}\p{M}\p{N}]/gu, '').replaceAll(/[-\s]+/g, '-') }))]
		}, { //! citations blocks starts with at least 3 `>` followed by an optional citation text and must end with the equivalent number of `>` on another line
			when: /^( *>{3,})([^>\n].*)?\n([\S\s]*)\n\1\n/,
			open: (_, _lv, cite, body) => [elem('blockquote', { cite }, [...this.parse(body)])],
		}, { //! code blocks starts with at least 3 `` ` `` followed by an optional code language and must end with the equivalent number of `` ` ``
			when: /^(`{3,})(.*)\n([\S\s]*?)\n\1\n/,
			open: (_, _lv, lang, body) => [elem('pre', {}, [elem('code', { lang }, [new Text(body)])])],
		}, { //! tables lines starts and end with a `|`, a line can be a separator line `|:---:|` , otherwise it's a data line; separator prefixed line become headers
			when: /^(?:[|].+[|]\n)+/, // /^([|] *:?-+:? *[|])$/
			open: (_) => {
				const trs = _.split(/\n/).slice(0, -1).map(row => ({ sep: row.match(/[|] *?:?-+:? */), data: row.split('|').slice(1, -1) }));
				const [h, align] = [trs.findIndex(tr => tr.sep), (trs.find(tr => tr.sep) || { data: [] }).data.map(str => [{}, { align: (str.match(/:-/) ? 'left' : 'right') }, { align: 'center' }][(str.match(/:/g) || []).length])];
				return [elem('table', {}, trs.filter(tr => !tr.sep).map((tr, n) => elem('tr', {}, tr.data.map((td, i) => this.inline(td, elem(n < h ? 'th' : 'td', align[i]))))))];
			},
		}, { //! unordered lists items line starts with `*`, `+` or `-`, ordered lists start with number followed by a dot
			when: /^( *)([\*\+\-]|(?:\d+\.)) (.*)\n/,
			open: (_, _lv, mode, body, [parent]) => function list(parent, attr, li) { // some bug on type change ...
				if (parent.level === attr.level && parent.mode === attr.mode) return parent.append(li);
				if (parent.level === undefined || parent.mode !== attr.mode) return [elem(attr.start ? 'ol' : 'ul', attr, [li])];
				for (let i = 0; i != attr.level; i++)parent.appendChild(parent = elem(attr.start ? 'ol' : 'ul', attr, [li]))
			}(parent, { level: _lv.length >> 1, mode: mode.slice(-1), start: mode.slice(0, -1) || undefined }, this.inline(body, elem('li'))),
		}, { //! blank line generate a new paragraph
			when: /^\s*\n/,
			open: () => [elem('p')]
		}
	];
	constructor(options = {}) {
		Object.assign(this, { newline: true, compact: true, prefix: '' }, options);
	}
	inline(line, parent) {
		let pos = 0;
		const matches = this.inline_rules.map((rule) => [...line.matchAll(rule.when)].map(m => [rule.open, m])).flat().sort((a, b) => a[1].index - b[1].index);
		for (let [cb, m] of matches) {
			if (m.index < pos) { continue; } // skip already matched 
			parent.appendChild(new Text(line.slice(pos, m.index)));
			pos = m.index + m[0].length;
			cb(parent, m);
		}
		parent.appendChild(new Text(line.slice(pos)));
		return parent;
	};
	parse(lines) {
		let block_rule, last_match, last_block;
		const parent = elem('template', {}, last_block = [elem('p')]); // default first block
		if (lines.includes('\r'))
			lines = lines.replaceAll('\r',''); // UNIX newline only
		if (!lines.endsWith('\n'))
			lines += '\n'; // UNIX principle: all line must end with \n
		do
			if (block_rule = this.block_rules.find(r => last_match = lines.match(r.when))) {
				const to_append = block_rule.open(...last_match, last_block);
				to_append && parent.append(...(last_block = to_append), ...this.compact ? [elem('p')] : []);
			} else {
				if (parent.lastChild.innerText)
					parent.lastChild.appendChild(this.newline ? elem('br') : new Text('\n'));
				this.inline((last_match = lines.match(/.*\n/))[0].trim(), parent.lastChild);
			}
		while (lines = lines.slice(last_match[0].length));
		parent.querySelectorAll(':scope>p:empty').forEach(ch => parent.removeChild(ch));
		return parent.childNodes;
	}
}
