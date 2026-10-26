---
layout: post
title:  "What do you mean, homoiconic?"
tags: [wasm, c, comp]
date:   2023-03-09 22:25:13 -0500
giscus: https://giscus.jburgy.workers.dev/client.js
---

Emboldened by the [previous post]({% post_url 2023-02-24-what-forth-again %}) on bringing FORTH to your browser
and still intrigued by [xterm.js](https://xtermjs.org/), this post explores a different dynamic language
in Webassembly.  We also want to learn new things as we go so we will take a slightly different approach
this time.

If you read the previous post (don't worry if you didn't, this one stands on its own), you remember
that FORTH, to the extent it has any syntax, is a post-fix language. We want a pre-fix language to
change things up.  To maintain our recent vibe, we want a _retro_ infix language. (I already have
[a retro infix language](https://troypress.com/the-tiny-basic-interpretive-language-il-and-onions/)
in mind for a follow-up post).  Enter the grand-daddy of them all:
[Lisp](https://en.wikipedia.org/wiki/Lisp_(programming_language)). Lisp was first made public in
McCarthy's
[Recursive Functions of Symbolic Expressions and Their Computation by Machine, Part I](http://www-formal.stanford.edu/jmc/recursive.html)
which defines it by means of a [meta-circular evaluator](https://en.wikipedia.org/wiki/Meta-circular_evaluator). 

I like to think of FORTH code as the linear stream of instructions sent to the processing unit.
By contrast, Lisp code is a direct representation of the n-ary syntax tree of the program.
The representation is known as [s-expressions](https://en.wikipedia.org/wiki/S-expression):

<figure>
    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Corrected_S-expression_tree_2.svg/500px-Corrected_S-expression_tree_2.svg.png" crossorigin="anonymous">
    <figcaption>S-expression for <code class="language-lisp highlighter-rouge">(* 2 (+ 3 4))</code></figcaption>
</figure>

This direct relationship between Lisp's syntax and its internal data structures is what we mean by
homoiconicity (ὁμός "same" + εἰκών "likeness"). Computer science instructors often recommend that their students
keep [logic and data separate](http://wiki.c2.com/?SeparationOfDataAndCode). That advice is moot in Lisp where code is data and data is code.
I have seen first-hand many examples of professional developers taking this separation too far
[in industrial software](https://en.m.wikipedia.org/wiki/Greenspun%27s_tenth_rule).

I could have attempted writing a lisp interpreter from scratch but it's so much easier to adapt an
existing one. A bunch of clever hackers wrote [one small enough](https://justine.lol/sectorlisp2/)
to fit on a 512kb boot sector!

[Justine](https://justine.lol/) and her hacker friends already provide a 
[reference implementation in C](https://github.com/jart/sectorlisp/blob/main/lisp.c). We
could have compiled it to WASM with Emscripten but that would be cheating. It would also have produced
unnecessarily large assets since Emscripten shims the required bits of libc.  An x86 emulator in WASM like 
[WebVM](https://webvm.io) would have been an alternative but [v86](https://copy.sh/) already did this
for [sectorlisp](https://copy.sh/v86/?profile=sectorlisp)!  In the spirit of minimalism, we chose to 
do more to end up with less.  So we translated lisp.c to [assemblyscript](https://www.assemblyscript.org/).
Assemblyscript is to WASM what early C was to ASM: a high-level assembler.  Search and replace got us
90% of the way there. The remaining 10% (measured in LoC, not time) were spent figuring out the precise
semantics of [`load<T>`](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/Memory/load) and
connecting to the [pseudo-terminal](https://xterm-pty.netlify.app/).

I wished I had read Justine's post more closely, particularly the section about their
[memory model](https://justine.lol/sectorlisp2/#memory).  That would have saved me reverse engineering
[lisp.c](https://github.com/jart/sectorlisp/blob/main/lisp.c), particularly lines which use this definition
```c
#define M (RAM + sizeof(RAM) / sizeof(RAM[0]) / 2)
```
Unfortunately, [`load<T>`](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/Memory/load)
does not tolerate negative offsets the way C does
(instead it throws `RuntimeError: memory access out of bounds`). This forced me to use `load<u8>(i, M)` when `i > 0` and
`load<T>(M + (i << align))` otherwise.

You can read the finished product [here](https://github.com/jburgy/blog/blob/main/lisp/assembly/core.ts)
but it's much more fun to interact with it directly. Since I wrote this post, the same language has grown
two more implementations, so pick a tab to switch between all three (they share a terminal and the
[same preamble](#eliza), more or less):

<div id="lisp-tabs" role="tablist">
    <button type="button" role="tab" data-wasm="/blog/lisp-wasi.wasm" data-preamble="/blog/lisp/eliza.lisp">core.ts</button>
    <button type="button" role="tab" data-wasm="/blog/lisp-wast.wasm" data-preamble="/blog/lisp/eliza.lisp">core.wast</button>
    <button type="button" role="tab" data-wasm="/blog/tabulate.wasm" data-preamble="/blog/lisp/eliza.f">lisp.f</button>
</div>
<div id="terminal"></div>
<style>
    #lisp-tabs {
        display: flex;
        gap: 0.5em;
        margin-bottom: 0.5em;
    }
    #lisp-tabs button {
        font: inherit;
        padding: 0.3em 0.8em;
        border: 1px solid currentColor;
        border-radius: 0.3em;
        background: transparent;
        color: inherit;
        cursor: pointer;
    }
    #lisp-tabs button[aria-selected="true"] {
        font-weight: bold;
        background: rgba(128, 128, 128, 0.25);
    }
</style>
<script type="module">
    import { REPL } from "/blog/wasi-repl.mjs";

    const tabs = document.querySelectorAll("#lisp-tabs button");
    let repl;

    // Every tab drives the same `new REPL(module, preamble, container)`.
    // dispose() tears down the previous Terminal before the next REPL takes over #terminal.
    function select(tab) {
        tabs.forEach((other) => other.setAttribute("aria-selected", String(other === tab)));
        repl?.dispose();
        const { wasm, preamble } = tab.dataset;
        repl = new REPL(
            new URL(wasm, location.href),
            new URL(preamble, location.href),
            document.getElementById("terminal"),
        );
    }

    tabs.forEach((tab) => tab.addEventListener("click", () => select(tab)));
    select(tabs[0]);
</script>

- **`core.ts`** is the AssemblyScript translation described above. It compacts its heap after every `EVAL`.
- **[`core.wast`](https://github.com/jburgy/blog/blob/main/lisp/assembly/core.wast)** is the same interpreter
  written by hand in WebAssembly text format with brevity as the only goal: about 1.3 KB of wasm against 2.3 KB
  for the compiled `core.ts`. The savings come from memory layout rather than golfing. Pointers are raw byte
  addresses and `NIL` is 0, so `CAR` and `CDR` are single loads. Atoms live below `0x8000` and cons cells above
  it, so telling them apart is one comparison. The tokenizer reads each token straight into the end of the
  symbol table, so interning never copies, and compacting the heap is one `memory.copy`. Each atom also holds
  its own value, so looking up a variable is a single load; calling a lambda swaps its arguments into the
  parameters' slots and swaps them back afterwards (_shallow_ binding, a different implementation of the
  _dynamic_ scoping `core.ts` already has, not a change to it).
- **[`lisp.f`](https://github.com/jburgy/blog/blob/main/lisp/lisp.f)** is the same language in FORTH. It runs on
  `tabulate.wast`, one of the interpreters from [the previous post about FORTH]({% post_url 2025-11-29-how-many-roads %}),
  and replaces compaction with a mark-and-sweep garbage collector whose roots are the FORTH data and return
  stacks. A REPL takes a single preamble, so this tab's is `jonesforth.f`, `lisp.f`, `LISP` and ELIZA
  concatenated; give it a moment to load.

<a id="eliza"></a>The REPL above no longer drops you at a bare `* ` prompt: its preamble is now
[ELIZA](https://en.wikipedia.org/wiki/ELIZA), Joseph Weizenbaum's 1964 pattern-matching chatbot that plays
psychotherapist by reflecting your own words back as questions. Once she greets you, just type a plain, active
sentence of your own, like `(I AM WORRIED ABOUT MY MOTHER)` &mdash; parentheses included, since `(READ)` wants one
complete s-expression, and in ALL CAPS, since sectorlisp's reader is case-sensitive and ELIZA's keyword matching only
recognizes uppercase symbols. Type `(BYE)` when you've had enough. WIRED
[put Claude on ELIZA's own couch](https://www.wired.com/story/ai-mother-eliza-claude-therapy/) and watched one of
her "distant descendants" fall into the same hedging, people-pleasing patterns a human patient might, nearly sixty
years on. There's something delightfully ironic about a 2026 LLM being the one writing you this introduction to a
1964 chatbot.

An enthusiastic reader looking for a learning challenge might want to tweak the compiled WASM
(use [wasm2wat](https://webassembly.github.io/wabt/demo/wasm2wat/) if necessary) and pick up some 
[stack optimizations](http://users.ece.cmu.edu/~koopman/stack_compiler/stack_co.html)
(particularly [intra-block stack scheduling](http://users.ece.cmu.edu/~koopman/stack_compiler/stack_co.html#intrablock) ones)
which [binaryen](https://github.com/WebAssembly/binaryen) missed. I took a different route with
[`core.wast`](https://github.com/jburgy/blog/blob/main/lisp/assembly/core.wast): rewrite from the
source instead, where a data layout change saves more instructions than any amount of scheduling.