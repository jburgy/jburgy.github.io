---
layout: post
title:  "How Many Roads Must a Man Walk Down?"
date:   2025-11-29 07:04:54 -0500
---

Look at me being all highfalutin and referencing "The Bard" when I ought to
admit this is more an "Oops!... I Did It Again" situation! I promised myself
I wouldn't and yet, here it is, I wrote yet another
[JONESFORTH](https://rwmj.wordpress.com/2010/08/07/jonesforth-git-repository/)
clone. I have no excuse. Well, I kinda do. I was
[nerd sniped](https://xkcd.com/356/) on discord. See, what happened was this:
I built all previous clones to [WebAssembly](https://webassembly.org/) so
[Paul Tarvydas](https://discord.com/users/762717526873341962) whether I
considered "writing Forth-ish directly in WAT (WASM)". I said no because I
was already aware of [WAForth](https://mko.re/blog/waforth/) which took
the conversation into an exploration of WAForth with its author, Remko. WAForth
inlines much more aggressively than JONESFORTH. It uses
[subroutine threading](https://en.wikipedia.org/wiki/Threaded_code#Subroutine_threading)
and "generates WebAssembly instructions in binary format". Quite the feat
if I'm honest.

But that strays rather far from JONESFORTH "simple"
[indirect threading](https://en.wikipedia.org/wiki/Threaded_code#Indirect_threading).
So I couldn't just let it go now, could I. And luckily, WebAssembly introduced
`return_call` and `return_call_indirect` around 2023.  So off I went.

I initially tried to have Claude do all the heavy lifting so I issued the
following prompt (with `jonesforth.S` in the context window):

>Please translate `jonesforth.S` from x86 assembly to WAT the textual Webassembly representation

And of it went, quickly producing reams of code.  I saved everything it produced
as a [GitHub gist](https://gist.github.com/jburgy/56c16cb3d5e366a1217949ac9d05ba7a).
It looked great at first but soon hit a bunch of "pointer out of bounds" errors
and Claude is not great at debugging, at least not yet.  I took a crack at it myself
but the horse was already out of the barn, Claude had produced too much code and
some of it was too different from the original source to be worth fixing.  Here is
an interesting data point though: Claude ported `WORD` and `NUMBER` from JONESFORTH 
but missed the, admittedly subtle, distinction between `WORD` (the primitive) and
`_WORD` (the actual implementation).  Wonder how I could have adjusted the prompt
to highlight it.

Claude also stumbled over the fact that JONESFORT uses
[indirect threading](https://en.wikipedia.org/wiki/Threaded_code#Indirect_threading).
And that's when I was humbly reminded of the quote, often attributed to Einstein:

>If you can't explain it simply, you don't understand it well enough.

I had already ported JONESFORTH three times then
([4th.c](https://github.com/jburgy/blog/blob/main/forth/4th.c),
[5th.c](https://github.com/jburgy/blog/blob/main/forth/5th.c), and
[6th.zig](https://github.com/jburgy/blog/blob/main/forth/6th.zig)) yet I _still_
couldn't explain the difference between direct and indirect threading **simply**.
Ironically, I think 
[I can now](https://discord.com/channels/1415980515806412813/1441786905980174458/1442326514065604710)!

I made a second attempt from scrach with Claude, this time using the following
prompt:

>`jonesforth.S` is an indirect threaded Forth interpreter written in 32-bit x86 assembly.
>I want you to produce the closest possible equivalent in WAT, the textual representation
>of WebAssembly. You will use `return_call_indirect` to replace `JMP *(%eax)` in the 
>`NEXT` macro. The `name_*` labels which jonesforth.S introduces via the `defcode` macro 
>will become WASM functions.

This time I tried to explain the `WORD`/`_WORD` duality in follow-up prompts but we
were going in circles so I stopped, grabbed the outer shell, and started down
the good ole-fashioned "artisanal" route of typing the bloody code myself!
I will admit that Claude's two failed attempts gave me plenty of good pointers
on the [WebAssembly text format](https://developer.mozilla.org/en-US/docs/WebAssembly/Guides/Understanding_the_text_format).
I chose to use S-expressions throughout for readability although YMMV.

[Richard WM Jones](https://rwmj.wordpress.com/about/) uses a lot of
GNU assembler macros in `jonesforth.S`.  My C implementations use the
C Preprocessor to similar effect.  Zig prides itself on having "no preprocessor,
no macros" but offers comptime metaprogramming instead.  WebAssembly provides
none of that.  So I wrote a poor man's assembler of sorts in
[python](https://github.com/jburgy/blog/blob/main/forth/wasm/dictionary.py).
At its core, it's but a `dict` of word definitions and a loop to print them along with headers (using 
[`data`](https://developer.mozilla.org/en-US/docs/WebAssembly/Guides/Understanding_the_text_format#webassembly_memory))
and `funcref` registrations (using 
[`elem`](https://developer.mozilla.org/en-US/docs/WebAssembly/Guides/Understanding_the_text_format#webassembly_tables)).
Take `SWAP` for example:
```scheme
    (data (i32.const 0x5054) "\44\50\00\00\04SWAP\00\00\00\02\00\00\00")
    (func $swap (type 0)
        (local $t i32)
        (local.set $t (i32.load offset=4 (global.get $sp)))
        (i32.store offset=4 (global.get $sp) (i32.load (global.get $sp)))
        (i32.store (global.get $sp) (local.get $t))
        (return_call $next)
    )
    (elem (i32.const 0x2) $swap)
```
Its header starts at address `0x5054` with a link to the start of the preceding word
(in this case `DROP` at address `0x5044` and yes, WebAssembly is
[little-endian](https://en.wikipedia.org/wiki/Endianness)).  The next byte (`0x04`) encodes
the length and potential flags like `HIDDEN` or `IMMEDIATE`.  The name itself (`"SWAP"`) follows,
with padding to the next 4 byte word boundary.  Finally, because `SWAP` is built in (i.e.
implemented in WebAssembly), its code word is just the _index_ of `$swap` in the funcref table.
The first 2 and last 3 lines in this snippet were generated by python.

`jonesforth.wast`(https://github.com/jburgy/blog/blob/main/forth/wasm/jonesforth.wast)
started as a _direct threading_ interpreter which meant it could at best execute composite
words consisting _entirely_ of builtin words.  One could imagine an implementation that
[inlines](https://github.com/jburgy/blog/blob/main/forth/wasm/jonesforth.wast) aggressively
to maintain that invariant but that would lead to 
[code bloat](https://en.wikipedia.org/wiki/Code_bloat) and is certainly not how JONESFORTH
works.  
[2eb3615](https://github.com/jburgy/blog/pull/17/commits/2eb361565961b22dcd3a0768f123ebe0a808a208)
converted to _indirect threading_ and the following two lines go a long way to
explain the difference:
```diff
-   (data (i32.const 0x53ec) "\dc\53\00\00\04>DFA\00\00\00\00\00\00\00\42\00\00\00\0d\00\00\00\23\00\00\00")
+   (data (i32.const 0x53ec) "\dc\53\00\00\04>DFA\00\00\00\00\00\00\00\e8\53\00\00\fc\50\00\00\10\52\00\00")
```
`>DFA` is the first composite word to appear in `jonesforth.S`.  It decompiles to
`: >DFA >CFA 4+ ;`.  Before
[2eb3615](https://github.com/jburgy/blog/pull/17/commits/2eb361565961b22dcd3a0768f123ebe0a808a208),
its data consisted of the _indices_ of `>CFA`, `4+`, and `EXIT` in the funcref table.
Afterwards, its data became the **code field addresses** of those same words.  So `NEXT`
[_loads_](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/Memory/load) the value
at memory address `0x53fc` (16 bytes _past_ `0x53ec` to skip the link to `>CFA`, flag, name,
padding, and _index_ of `DOCOL` (0)), see another memory address (`0x53e8`) which it needs to
_load_ before it can `return_call_indirect` the corresponding function.  Note also how the first 
data word (`0x53e8`) is exactly 12 bytes past the link (`0x53dc`).  The link points to the
`>CFA` _word_ (with header) whereas `>DFA`'s first data element points to the _address_ of `>CFA`'s
_code field_!  Oh, the joys of pointer arithmetic!

To recap, it's somehow fitting that this should be my fourth Forth!

| Language | Strategy               | Source                                                                                            |
|:---------|:-----------------------|--------------------------------------------------------------------------------------------------:|
| C        | Labels as Values       | [4th.c](https://github.com/jburgy/blog/blob/main/forth/4th.c)                                     |
| C        | `musttail`             | [5th.c](https://github.com/jburgy/blog/blob/main/forth/5th.c)                                     |
| Zig      | `.always_tail`         | [6th.zig](https://github.com/jburgy/blog/blob/main/forth/6th.zig)                                 |
| WAT      | `return_call_indirect` | [jonesforth.wast]([6th.zig](https://github.com/jburgy/blog/blob/main/forth/wasm/jonesforth.wast)) |

And it's entirely unacceptable that the "native" WebAssembly implementation is the only one to
**not** have a browser demo!  That's because I developed it on [WASI](https://wasi.dev/) to
iterate quickly in the command line.  I'll work on a [shim](https://en.wikipedia.org/wiki/Shim_(computing))
real soon.
