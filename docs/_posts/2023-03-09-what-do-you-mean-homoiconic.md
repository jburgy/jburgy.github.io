---
layout: post
title:  "What do you mean, homoiconic?"
date:   2023-03-09 22:25:13 -0500
---

Emboldened by the [previous post](/2023/02/24/what-forth-again.html) on bringing FORTH to your browser
and still intrigued by [xterm.js](http://xtermjs.org/), this post explores a different dynamic language
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
    <img src="http://upload.wikimedia.org/wikipedia/commons/thumb/1/11/S-expression_tree.svg/220px-S-expression_tree.svg.png" crossorigin="anonymous">
    <figcaption>S-expression for (* 2 (+ 2 4))</figcaption>
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
could have compiled it to WASM with emscripten but that would be cheating. It would also have produced
unnecessarily large assets since emscripten shims the required bits of libc.  An x86 emulator in WASM like 
[WebVM](https://webvm.io) would have be an alternative but [v86](https://copy.sh/) already did this
for [sectorlisp](https://copy.sh/v86/?profile=sectorlisp)!  In the spirit of minimalism, we chose to 
do more to end up with less.  So we translated lisp.c to [assemblyscript](https://www.assemblyscript.org/).
Assemblyscript is to WASM what early C was to ASM: a high-level assembler.  Search and replace got us
90% of the way there. The remaining 10% (measured in LoC, not time) were spent figuring out the precise
semantics of [`load<T>`](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/Memory/Load) and
connecting to the [pseudo-terminal](https://xterm-pty.netlify.app/).

I wished I had read Justine's post more closely, particularly the section about their
[memory model](https://justine.lol/sectorlisp2/#memory).  That would have saved me reverse engineering
[lisp.c](https://github.com/jart/sectorlisp/blob/main/lisp.c), particularly this line
```c
#define M (RAM + sizeof(RAM) / sizeof(RAM[0]) / 2)
```
Unfortunately, [`load<T>`](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/Memory/Load)
does not tolerate negative offsets (`RuntimeError: memory access out of bounds`). This forced me to use `load<u8>(i, M)` when `i > 0` and
`load<T>(M + (i << align))` otherwise.

You can read the finished product [here] but it's much more fun to interact with it directly:

<div id="terminal"></div>
<script src="https://cdn.jsdelivr.net/npm/xterm@4.17.0/lib/xterm.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/xterm-pty@0.9.4/index.js"></script>
<script>
    const xterm = new Terminal();
    xterm.open(document.getElementById("terminal"));

    const { master, slave } = openpty();
    xterm.loadAddon(master);

    const worker = new Worker("/assets/js/lisp.worker.js");
    new TtyServer(slave).start(worker);
</script>

An enthusiastic reader looking for a learning challenge might want to tweak the compiled WASM
(use wasm2wat if necessary) and pickup some [stack optimizations](http://users.ece.cmu.edu/~koopman/stack_compiler/stack_co.html)
(particularly [intra-block stack scheduling](http://users.ece.cmu.edu/~koopman/stack_compiler/stack_co.html#intrablock) ones)
which [binaryen](http://webassembly.github.io/binaryen/) missed.