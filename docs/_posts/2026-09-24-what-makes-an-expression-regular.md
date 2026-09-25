---
layout: post
title:  "What Makes an Expression Regular?"
date:   2026-09-24 00:00:00 -0400
---

TODO: intro to Ken Thompson's 1968 paper and
[regexp.f](https://github.com/jburgy/blog/blob/main/regexp/regexp.f).

<style>
	.regexp-demo .query {
		display: flex;
		gap: .5rem;
		align-items: flex-end;
		flex-wrap: wrap;
	}

	.regexp-demo .query__label {
		display: flex;
		flex-direction: column;
		gap: .25rem;
		flex: 1 1 18rem;
		font-size: .85rem;
		text-transform: uppercase;
		letter-spacing: .06em;
		opacity: .75;
	}

	.regexp-demo .query input,
	.regexp-demo .query button,
	.regexp-demo .examples button {
		font: inherit;
		border: 1px solid currentColor;
		border-radius: .25rem;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}

	.regexp-demo .query input,
	.regexp-demo .query button {
		padding: .5rem .75rem;
	}

	.regexp-demo .query input {
		font-family: Menlo, Consolas, monospace;
		text-transform: none;
		letter-spacing: normal;
		cursor: text;
	}

	.regexp-demo .examples button {
		font-family: Menlo, Consolas, monospace;
		margin: 0 .35rem .35rem 0;
		padding: .15rem .45rem;
		border-color: rgba(128, 128, 128, .5);
	}

	.regexp-demo .status {
		min-height: 1.6em;
		font-size: .9rem;
		opacity: .75;
	}

	.regexp-demo .panel[data-state="error"] .status {
		color: #dc322f;
		opacity: 1;
	}

	.regexp-demo .subject {
		border: 1px solid rgba(128, 128, 128, .4);
		border-radius: .25rem;
		padding: 1rem;
		text-align: justify;
		white-space: pre-wrap;
	}

	.regexp-demo .subject mark {
		background: #b58900;
		color: #fff;
		border-radius: .15rem;
	}
</style>

<div class="regexp-demo">
	<p class="examples">
		Try:
		<button type="button">dolor</button>
		<button type="button">l(a|o)b</button>
		<button type="button">(a|e|i|o|u)(a|e|i|o|u)</button>
		<button type="button">do*l</button>
		<button type="button">e(x|s)</button>
	</p>
	<div id="regexp-demo"></div>
</div>

<script type="module">
	import { createPanel, attach } from '/blog/regexp/web/demo.mjs';

	const panel = createPanel(document);
	document.getElementById('regexp-demo').append(panel);

	const status = panel.querySelector('[data-role="status"]');
	status.textContent = 'booting the FORTH image\u2026';

	const { run, input } = await attach(panel);
	input.value = 'l(a|o)b';
	run();

	for (const button of document.querySelectorAll('.regexp-demo .examples button')) {
		button.addEventListener('click', () => {
			input.value = button.textContent;
			run();
		});
	}
</script>

The syntax is the one from the paper: concatenation, `|` for alternation, `*` for
closure, `(`&hellip;`)` for grouping and `\` to escape. Thompson's machine reports
the _shortest_ match at the leftmost position, so `(a|b)*a` stops at the first `a`
rather than running to the last one.

![Every layer of the regexp.f demo, frozen halfway through matching a(b|c)*d against abccbcccd](/blog/regexp-snapshot.svg)
