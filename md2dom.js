/*  Issues:
- too much paragraph (every lines)
- no list unstacking
*/
const elem = (tag, props = {}, ch = []) => ch.reduce((e, c) => (e.appendChild(c), e), Object.assign(document.createElement(tag), props))

const inline_rules = [
	{
		when: /_([^_]+?)_/g,
		open: (e, m) => inline_parse(e.appendChild(elem("em")), m[1])
	},
	{
		when: /\*([^\*]+?)\*/g,
		open: (e, m) => inline_parse(e.appendChild(elem("em")), m[1])
	},
	{
		when: /__([^_]+?)__/g,
		open: (e, m) => inline_parse(e.appendChild(elem("strong")), m[1])
	},
	{
		when: /\*\*([^\*]+?)\*\*/g,
		open: (e, m) => inline_parse(e.appendChild(elem("strong")), m[1])
	},
	{
		when: /~([^~]+?)~/g,
		open: (e, m) => inline_parse(e.appendChild(elem("strike")), m[1])
	},
	{
		when: /`([^`]+?)`/g,
		open: (e, m) => inline_parse(e.appendChild(elem("code")), m[1])
	},
	{
		when: /``(.+?)``/g,
		open: (e, m) => inline_parse(e.appendChild(elem("code")), m[1])
	},
	{
		when: /\[\s*!\[(.*?)\]\((.+?)\)\s*\]\((.+?)\)/g,
		open: (e, m) => (e.appendChild(elem("a", { href: m[3] }, [elem("img", { alt: m[1], src: m[2] })])), m[1])
	},
	{
		when: /\[\s*(.*?)\s*\]\((.+?)\)/g,
		open: (e, m) => inline_parse(e.appendChild(elem("a", { href: m[2] })), m[1])
	},
	{
		when: /!\[\s*(.*?)\s*\]\((.+?)\)/g,
		open: (e, m) => (e.appendChild(elem("img", { alt: m[1], src: m[2] })), m[1])
	},
	{
		when: /  $/g,
		open: (e) => e.appendChild(elem("br"))
	},
];
function inline_parse(e, txt) {
	let pos = 0;
	const matches = inline_rules.map((rule) => [...txt.matchAll(rule.when)].map(m => [rule.open, m])).flat().sort((a, b) => a[1].index - b[1].index);
	for (let [cb, m] of matches) {
		if (m.index < pos) { continue; } // skip already matched 
		e.appendChild(new Text(txt.slice(pos, m.index)));
		pos = m.index + m[0].length;
		cb(e, m);
	}
	e.appendChild(new Text(txt.slice(pos)));
	return e;
};
const block_rules = [
	{
		when: /^((?:(?: {4}|\t).*\n)+)/,
		open: ([_, code], ctx) => elem('pre', {}, [elem('code', { skip: ctx.line += code.split('\n').length - 1 }, [new Text(code)])])
	}, {
		when: /^ {0,3}(?:(?:-[ \t]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})[ \t]*\n/,
		open: () => elem('hr'),
	}, {
		when: /^ {0,3}(#{1,6}) (.*?)[ \t]*#*[ \t]*\n/,
		open: ([_, level, header]) => inline_parse(elem(`h${level.length}`), header)
	}, {
		when: /^ {0,3}([^ \t]+)\n *(-+|=+)[ \t]*\n/,
		open: ([_, header, [type]], ctx) => (ctx.line++, inline_parse(elem(`h${type == '=' ? 1 : 2}`), header))
	}, {
		when: /^ {0,3}```(.*)\n([\S\s]*)\n```\n/,
		open: ([_, lang, code], ctx) => elem('pre', {}, [elem('code', { lang, skip: ctx.line += _.split('\n').length - 2 }, [new Text(code)])]),
	}, {
		when: /^ {0,3}([|].*)\n *([|] ?:?-+:? ?.*)\n *((:?[|].*\n)+)/,
		open: ([_, thead, align, rows], ctx) => {
			const aligns = align.split('|').filter(e => e.trim()).map(str => ['', (str.match(/:-/) ? 'left' : 'right'), 'center'][str.split(':').length - 1]);
			ctx.line += _.split('\n').length - 2;
			return elem('table', {}, [
				elem('thead', {}, [elem('tr', {}, thead.split('|').filter(s => s.trim()).map((th) => inline_parse(elem('th'), th.trim())))]),
				elem('tbody', {}, rows.split('\n').map(cols => cols.split('|').filter(e => e.trim())).map(tr =>
					elem('tr', {}, tr.map((td, i) => inline_parse(elem('td', aligns[i] ? { align: aligns[i] } : {}), td.trim())))
				))
			]);
		},
	}, {// in stark contrast with previous rules, the list/quote rules is way too complex
		when: /^ {0,3}([-+*>]|(?:\d+[\.\)])) (.*)/,
		open: (m, ctx) => {
			function deindent({ markdown, linesIdx, line }, indent) {
				let lines = '', start = line;
				for (; line < linesIdx.length; line++) {
					const l = markdown.slice(linesIdx[line], linesIdx[line + 1]);
					if (l.slice(0, Math.min(l.length, indent)).trim() !== '') break;
					lines += l.slice(indent);
					//indexes
				}
				return [lines, line - start - 1]
			}
			const split = ([_, type, line]) => [type.slice(0, -1), type.slice(-1), line, _.length - line.length + '\n'.length];
			const [start, type, firstline, indent] = split(m);
			const bq = type == '>';
			const item = bq ? 'p' : 'li';
			const tag = bq ? 'blockquote' : (type == '.' || type == ')') ? 'ol' : 'ul';
			const lis = [inline_parse(elem(item), firstline)];
			ctx.line++;
			const [deindented, size] = deindent(ctx, indent);
			if (deindented) {
				lis[0].replaceChildren(...parse(firstline + '\n' + deindented));
				ctx.line += size;
				console.log('goto', size, deindented.split('\n'))
			} else for (; ctx.line < ctx.linesIdx.length; ctx.line++) {
				// glob next *indented* lines until another regexp match
				const lines = ctx.markdown.slice(ctx.linesIdx[ctx.line]);
				const line = ctx.markdown.slice(ctx.linesIdx[ctx.line], ctx.linesIdx[ctx.line + 1]);
				let match; // for reuse
				const rule = ctx.block_rules.find(r => match = lines.match(r.when));
				if (!rule) { // no new block => append to last item
					inline_parse(lis[0], line);
				} else if (rule != ctx.rule) {
					ctx.line--;
					break;
				} else {
					const [_sub_start, sub_type, sub_innerText] = split(match);
					if (sub_type == type) { // TODO: check if same indent
						lis.unshift(inline_parse(elem(item), sub_innerText));
					} else { // change of type
						ctx.line--; // unshift line
						break; // so next parser loop can do it job 
					}
				}
			}
			return elem(tag, { start }, lis.reverse());
		},
	}, { // last chance => paragraph
		when: /^\n(?:[^\n]*)/,
		open: () => []
	}
];
function parse(markdown, parent = elem('template', {}, [elem('p')])) {
	const ctx = { markdown: markdown + '\n', linesIdx: [0], block_rules };
	for (let i = 0; i < ctx.markdown.length; i++) {
		if (ctx.markdown[i] === "\n") ctx.linesIdx.push(i + '\n'.length);
	}
	for (ctx.line = 0; ctx.line < ctx.linesIdx.length; ctx.line++) {
		const lines = ctx.markdown.slice(ctx.linesIdx[ctx.line]); // console.debug('lines:', [lines]);
		if (ctx.rule = ctx.block_rules.find(r => lines.match(r.when))) { // console.debug('found:', rule_started);
			parent.append(ctx.rule.open(lines.match(ctx.rule.when), ctx), elem('p'));//TODO: ctx.line+=match().length ?
		} else { // no starting block => append (lazy?) line to lastChild
			const line = ctx.markdown.slice(ctx.linesIdx[ctx.line], ctx.linesIdx[ctx.line + 1]);
			inline_parse(parent.lastChild, line.trim()); //console.log('lazyline', [line], 'to:', parent.lastChild);
		}
	}
	// p:empty does not match :blank p, so we do it ourself
	parent.querySelectorAll(':scope>p:empty').forEach(ch => parent.removeChild(ch));
	console.log([...parent.childNodes].map(c => c.outerHTML).join('\n'))
	return parent.childNodes;
}

export { parse };