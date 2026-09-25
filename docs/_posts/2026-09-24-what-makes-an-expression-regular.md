---
layout: post
title:  "What Makes an Expression Regular?"
date:   2026-09-24 00:00:00 -0400
---

Regular readers (both of you) will have noticed a theme. This blog keeps coming back to
programming languages and the machinery that runs them: a
[JIT in Julia]({% post_url 2022-04-02-what-makes-julia-delightful %}),
[FORTH]({% post_url 2022-05-28-what-is-forth %}) and
[FORTH again]({% post_url 2023-02-24-what-forth-again %}),
[FORTRAN]({% post_url 2023-01-15-what-to-about-fortran %}),
[Lisp]({% post_url 2023-03-09-what-do-you-mean-homoiconic %}),
[Tiny BASIC]({% post_url 2023-03-16-put-it-in-a-brandy-snifter %}),
[tail calls]({% post_url 2024-04-29-tail-recursion %}),
[Zig]({% post_url 2024-08-31-why-not-zig %}), and yet another
[JONESFORTH in WebAssembly]({% post_url 2025-11-29-how-many-roads %}). The grown-up way
to study all this is to work through the
[dragon book](https://en.wikipedia.org/wiki/Compilers:_Principles,_Techniques,_and_Tools)
from cover to cover. I barely scratched its scales. Somewhere around chapter 3 I fell into
the rabbit hole that is regular expressions, a hole with only finitely many states that I
still haven't managed to climb out of. It's the hole charted by the dragon's more finite
cousin,
[Introduction to Automata Theory, Languages, and Computation](https://en.wikipedia.org/wiki/Introduction_to_Automata_Theory,_Languages,_and_Computation).

## 2004

I told part of this story
[before]({% post_url 2022-04-02-what-makes-julia-delightful %}). In 2004 I translated Ken
Thompson's 1968 paper, [Regular Expression Search
Algorithm](https://dl.acm.org/doi/10.1145/363347.363387), from IBM 7094 assembly to x86.
Thompson's grep didn't interpret regular expressions. It _compiled_ them to machine code
on the fly, and the lists of states it juggled were lists of branch instructions into that
code. Ken patiently answered my questions about `AXC **,7`.
[Russ Cox](https://swtch.com/~rsc/) kindly hosted the result, a
[buggy little hack](https://swtch.com/~rsc/regexp/regexp-x86.c.txt), and dutifully
reported that "it runs for a very long time, making me think it is stuck in an infinite
loop somewhere." I was vaguely aware that something was off, but not bothered enough to
chase it. I had a new Wall Street job, and hobby programming took a back seat.

## Eighteen years later

In 2022 I started this blog and promptly started nerding out on FORTH. I wrote countless
versions: in C, in Python bytecode, in Zig, in WebAssembly. Along the way I picked up a lot
more x86 than I ever knew in 2004, with
[JONESFORTH](https://rwmj.wordpress.com/2010/08/07/jonesforth-git-repository/) as my
reference.

Then I had an epiphany at work. I finally managed to
prompt Claude with a measure of reproducible success. So I turned my attention back to
`x86.c`. My first attempt, asking [DeepSeek](https://www.deepseek.com/) to find the bug,
went nowhere because I wasn't specific enough. What I needed was a proper minimal
reproduction. It turned out to be embarrassingly minimal: `a*` (doh). I handed that to
Claude Opus and, boom, it found two off-by-two errors that cancel out. `ALTERN` stored a
subexpression's entry point two bytes past the real one, and `KLEENE` read it back two
bytes short. For `a(b|c)*d`, the only test I had enabled of course, the two errors
cancelled perfectly. When `*` applies directly to a character, they don't, and `a*` spins
in an epsilon loop until the stack runs out. The fix brought back memories of the endless
trial and error of 2004: nudge an offset, reassemble, segfault, repeat. I wouldn't be
surprised if one of those nudges is what introduced the second error.

Emboldened, I suggested using x86 string instructions, which I had admired in JONESFORTH
(its `NEXT` is just `lodsl; jmp *(%eax)`) and in
[sectorlisp](https://justine.lol/sectorlisp2/). Yay for x86 code golf! Reading the next
character used to take `movb (%edx), %al; incl %edx`. Now it is a single-byte `lodsb`.

Slowly, an old ambition resurfaced: merging those two niches. The matcher only ever emits
four instructions: `jmp`, `cmp`, `jnz`, and `call`. FORTH already owns a code generator,
so why bring a second one? [regexp.f](https://github.com/jburgy/blog/blob/main/regexp/regexp.f)
is the result. `RE"` is an `IMMEDIATE` word that pokes threaded code into whatever
definition is being compiled. Where Thompson emitted 7094 transfer instructions and I
emitted x86 `call`s, `RE"` emits `BRANCH`, `0BRANCH`, `EXIT`, and a pair of helpers.

Put the two side by side and the family resemblance is striking. On the left is the 7094
code Thompson's paper prints for `a(b|c)*d`. On the right is what `SEE` decompiles after
`: RE-PAT RE" a(b|c)*d" ;`, exactly as the
[tests](https://github.com/jburgy/blog/blob/main/regexp/test_regexp.py) pin it down. `SEE`
prints `LIT` as its bare value, and an `XCALL` operand as the word it lands in, which is
`RE-PAT` itself.

<table class="re-listing">
<thead>
<tr><th></th><th>IBM 7094, Thompson 1968</th><th>regexp.f, <code>SEE RE-PAT</code></th></tr>
</thead>
<tbody>
<tr><td></td><td><pre>(CNODE, NNODE, FAIL and XCHG are
 runtime routines outside CODE)</pre></td><td><pre>: RE-PAT RSP@ RE-RSP ! RE-START
RE-DONE? 0BRANCH ( 16 ) 0 EXIT
RE-PAT+20 &gt;R
RE-THREAD DUP 0BRANCH ( 16 ) &gt;R BRANCH ( -24 )
DROP RE-LOAD</pre></td></tr>
<tr><td>a</td><td><pre> 0  CODE  TRA  CODE+1
 1        TXL  FAIL,1,-'a'-1
 2        TXH  FAIL,1,-'a'
 3        TSX  NNODE,4</pre></td><td><pre>BRANCH ( 4 )
97 RE-CHAR?
0BRANCH ( 8 ) EXIT
(NNODE)</pre></td></tr>
<tr><td>b</td><td><pre> 4        TRA  CODE+16
 5        TXL  FAIL,1,-'b'-1
 6        TXH  FAIL,1,-'b'
 7        TSX  NNODE,4</pre></td><td><pre>BRANCH ( 108 )
98 RE-CHAR?
0BRANCH ( 8 ) EXIT
(NNODE)</pre></td></tr>
<tr><td>c</td><td><pre> 8        TRA  CODE+16
 9        TXL  FAIL,1,-'c'-1
10        TXH  FAIL,1,-'c'
11        TSX  NNODE,4</pre></td><td><pre>BRANCH ( 56 )
99 RE-CHAR?
0BRANCH ( 8 ) EXIT
(NNODE)</pre></td></tr>
<tr><td>|</td><td><pre>12        TRA  CODE+16
13        TSX  CNODE,4
14        TRA  CODE+9
15        TRA  CODE+5</pre></td><td><pre>BRANCH ( 20 )
XCALL RE-PAT
BRANCH ( -84 )</pre></td></tr>
<tr><td>*</td><td><pre>16        TSX  CNODE,4
17        TRA  CODE+13</pre></td><td><pre>XCALL RE-PAT BRANCH ( 20 )
XCALL RE-PAT BRANCH ( 4 )</pre></td></tr>
<tr><td>&middot;d</td><td><pre>18        TRA  CODE+19
19        TXL  FAIL,1,-'d'-1
20        TXH  FAIL,1,-'d'
21        TSX  NNODE,4</pre></td><td><pre>BRANCH ( 4 )
100 RE-CHAR?
0BRANCH ( 8 ) EXIT
(NNODE)</pre></td></tr>
<tr><td>&middot;eof</td><td><pre>22        TRA  FOUND</pre></td><td><pre>RE-ACCEPT ;</pre></td></tr>
</tbody>
</table>

Row by row the correspondence is nearly one to one:

- **Out slots.** Every block starts with a jump that is really the _previous_ block's
  exit. Thompson's compiler back-patches it, and so does `RE-PATCH`. Look at the `b` row:
  Thompson's `TRA CODE+16` and my `BRANCH ( 108 )` both send whatever follows `a` into
  the closure.
- **Character tests.** Thompson's `TXL`/`TXH` pair brackets the character held in index
  register 1 and jumps to `FAIL` on either side. `97 RE-CHAR? 0BRANCH ( 8 ) EXIT` does
  the same thing, and `EXIT` _is_ `FAIL`: both return to the next entry of the current
  list.
- **Successors.** `TSX NNODE,4` and `(NNODE)` both call a routine whose return address
  is the next state, which it files away on the next list.
- **Branching.** `CNODE` and `XCALL` are mirror images. `CNODE` at `x` queues `x+1` and
  carries on at `x+2`. `XCALL` runs its operand first and leaves its continuation on the
  return stack, which is the current list. The closure takes four cells instead of two
  because of the empty-string revision Thompson describes in the paper's notes, which is
  also what keeps `a**` from looping forever.
- **Accepting.** `TRA FOUND` becomes `RE-ACCEPT`.

What makes this possible is that a FORTH compiler is not a black box. It is a loop that
reads a word and either _executes_ it or _appends_ it to the definition being compiled,
depending on `STATE`. Everything else is ordinary words you can call or redefine:

- `:` switches `STATE` to compiling, and `[` and `]` switch it back and forth in the
  middle of a definition. `: '*' [ CHAR * ] LITERAL ;` runs `CHAR *` _while compiling_,
  then `LITERAL` compiles the result as a constant. That is how `regexp.f` spells
  character constants.
- An `IMMEDIATE` word runs even while `STATE` says "compile". That is the hook. When the
  compiler meets `RE"` inside `: RE-PAT RE" a(b|c)*d" ;`, it doesn't compile a call to
  `RE"`. It runs it. `RE"` then reads the pattern straight off the input stream with
  `KEY`, so it gets to define its own little syntax, and runs all three of Thompson's
  stages right there, in the middle of compiling `RE-PAT`.
- The code generator is just `,`, the same word the compiler uses to append a cell at
  `HERE`. `HERE @` is Thompson's `pc`. Inside a definition, `'` quotes the next cell
  instead of executing it, so `' BRANCH ,` appends a `BRANCH` in the definition being
  built. That is FORTH's answer to Thompson's `instruction('tra', ...)`.

Thompson needed an ALGOL procedure to assemble 7094 instruction words, and `x86.c` needed
`mprotect(PROT_EXEC)` plus hand-encoded opcodes. In FORTH the dictionary is already
executable, so the matcher `RE"` produces is an ordinary word. You can `EXECUTE` it,
`SEE` it, and `FORGET` it like any other.

Thompson dismisses the first two stages of his compiler as "straightforward and not
discussed". The first inserts explicit concatenation operators, and the second is
Dijkstra's [shunting yard](https://en.wikipedia.org/wiki/Shunting_yard_algorithm), which
converts the result to reverse Polish notation. They're short enough to play with right
here:

<!-- TODO: PyScript demos of RE-PREPARE and the shunting yard (RE-CONVERT) -->

The third stage is the fun one. Below, `regexp.f` runs on top of `jonesforth.f`, inside a
hand-crafted WebAssembly FORTH interpreter,
[tabulate.wast](https://github.com/jburgy/blog/blob/main/forth/wasm/tabulate.wast), in your
browser. Typing a pattern really does compile it to threaded code and run it over the text.

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

	.re-listing {
		border-collapse: collapse;
		margin: 0 auto 1rem;
	}

	.re-listing th,
	.re-listing td {
		vertical-align: top;
		padding: .25rem .75rem;
		border-bottom: 1px solid rgba(128, 128, 128, .3);
	}

	.re-listing td:first-child {
		font-family: Menlo, Consolas, monospace;
		font-style: italic;
		opacity: .75;
	}

	.re-listing pre {
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		font-size: .85rem;
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

## What happens when you click Match?

More than you'd think. JavaScript hands the pattern to a WebAssembly function, which is a
FORTH interpreter. The interpreter compiles the pattern into a new FORTH word and
executes it. That word pushes and pops the addresses of NFA states on FORTH's two stacks,
all inside machine code that V8's TurboFan compiled from the WebAssembly. I wanted to see
all of it at once, so I
[instrumented](https://github.com/jburgy/blog/tree/main/regexp/tracing) the interpreter's
inner loop and froze it halfway through Thompson's own example, `a(b|c)*d`, matching
`abccbcccd`. Nothing below is drawn from memory. It was measured in Node 24 (V8 13.6) on an
Apple silicon Mac.

![Every layer of the regexp.f demo, frozen halfway through matching Thompson's example regex against abccbcccd](/blog/regexp-snapshot.svg)

The part that still delights me is the return stack. Thompson's `CLIST`, the states still
to try for the current character, is simply the return stack above the sentinel.
`RE-NLIST` collects the states for the next one. When a state matches, `(NNODE)` pops its
own return address and files it away, because the "return address" of that call _is_ the
next state. When a state fails, it just `EXIT`s, and returning lands in the next pending
thread. The whole NFA simulation is carried by FORTH's calling convention.

## Full circle

There's a certain irony in all this. FORTH is famous for having almost no syntax. As I put
it [before]({% post_url 2024-04-29-tail-recursion %}), there is "no tokenizer, lexer, or
syntax tree", only words separated by spaces. Regular expressions, meanwhile, are the
foundation of every lexer generator from [Lex](https://en.wikipedia.org/wiki/Lex_(software))
onward. The dragon book devotes a whole chapter to turning them into automata. So here is
the language that never needed a lexer, compiling the very thing lexers are made of.

Twenty-two years after my first attempt, the journey comes full circle: from Thompson's
7094 to x86, from x86 to FORTH, and from FORTH back to something Ken would recognize, a
regular expression compiled on the fly into code whose lists of states are just jumps into
itself. Finally without the infinite loop.
