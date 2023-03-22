---
layout: post
title:  "When did Basic become insulting?"
date:   2023-03-16 23:24:18 -0500
---

Two thoughts come to mind at the start of this third post along the same theme:

1. Let's hope that, unlike
[The Hitchhiker's Guide to the Galaxy](https://en.wikipedia.org/wiki/The_Hitchhiker%27s_Guide_to_the_Galaxy),
this is not part of an "increasingly inaccurately named" trilogy
1. All this talk of embedding interpreters in our browser is starting to remind us of the classic
[brandy snifter](https://www.nbc.com/saturday-night-live/video/put-it-in-a-brandy-snifter/2870520) SNL skit

[//]: # ![Put It in a Brandy Snifter](https://img.nbc.com/sites/nbcunbc/files/images/2015/6/06/150602_2870520_Lasting_Impressions___Brandy.jpg){:class="img-responsive"}

We recently covered [FORTH](/2023/02/24/what-forth-again.html), which uses
[postfix notation](https://en.wikipedia.org/wiki/Reverse_Polish_notation),
and [Lisp](docs/_posts/2023-03-09-what-do-you-mean-homoiconic.md), which uses
[prefix notation](https://simple.wikipedia.org/wiki/Prefix_notation)
(albeit with lots of parentheses).  It makes sense to pick an 
[infix](https://en.wikipedia.org/wiki/Infix_notation) language now.  But it's also fun to stick with
our retro theme.  Infix programming languages rely on a 
[formal grammar](https://en.wikipedia.org/wiki/Context-free_grammar) to define their syntax as well
as the precedence of their operators.  In computer science, these grammars are often written down
in [Backus-Naur form](https://en.wikipedia.org/wiki/Backus%E2%80%93Naur_form) named after
[John Backus](https://en.wikipedia.org/wiki/John_Backus) of 
[FORTRAN](docs/_posts/2023-01-15-what-to-about-fortran.md) fame and
[Peter Naur](https://en.wikipedia.org/wiki/Peter_Naur) who contributed to
[ALGOL 60](https://en.wikipedia.org/wiki/ALGOL_60).

Modern interpreters and compilers often rely on tools which generate
[lexers](https://en.wikipedia.org/wiki/Lexical_analysis) and
[parsers](https://en.wikipedia.org/wiki/Parsing) directly from the formal grammar.
[Lex](https://en.wikipedia.org/wiki/Lex_(software)) and [Yacc](https://en.wikipedia.org/wiki/Yacc)
are early examples of such tools.  What did hobbyists do before these tools became
widely available?  A hand-crafted [recursive descent parser](https://en.wikipedia.org/wiki/Recursive_descent_parser)
is one approach.  It looks straightforward and almost systematic at first but, speaking from experience,
can prove frustratingly fiddly.

The [Homebrew Computer Club](https://en.wikipedia.org/wiki/Homebrew_Computer_Club), an
informal group of hackers, came up with a wonderfully pragmatic solution to this problem in response to
Bill Gates kvetching about people pirating [Altair BASIC](https://en.wikipedia.org/wiki/Altair_BASIC):
they defined their own dialect called [Tiny BASIC](https://en.wikipedia.org/wiki/Tiny_BASIC).
[Dennis Allison](https://en.wikipedia.org/wiki/Dennis_Allison) wrote a technical specification
for it.  His design was based on an intermediate language (TBIL) to aid porting and 
[running light without overbyte](https://en.wikipedia.org/wiki/Dr._Dobb%27s_Journal).
As an interesting historical aside, the original [BASIC](https://en.wikipedia.org/wiki/BASIC) was
designed by [John G. Kemeny](https://en.wikipedia.org/wiki/John_G._Kemeny) and
[Thomas E. Kurtz](https://en.wikipedia.org/wiki/Thomas_E._Kurtz) who were both at
[Dartmouth College](https://en.wikipedia.org/wiki/Dartmouth_College).  Coincidentally,
Dartmouth is also where John McCarthy [began thinking about creating a language](https://twobithistory.org/2018/10/14/lisp.html).
And if you're curious what it felt like to discover programming with BASIC, I highly
recommend [this article](https://twobithistory.org/2018/09/02/learning-basic.html).

Luckily, [Tom Pittman](https://en.wikipedia.org/wiki/Tom_Pittman_(computer_scientist)) published
a bunch of content about his amazing contributions to Tiny BASIC on 
[http://www.ittybittycomputers.com](http://www.ittybittycomputers.com/IttyBitty/TinyBasic/).
In particular, the [Tiny BASIC Experimenter's Kit](http://www.ittybittycomputers.com/IttyBitty/TinyBasic/TBEK.txt)
(also in [HTML](http://retro.hansotten.nl/uploads/files/tbek.html))
describes every "Interpretive Language Operation Code" starting on page 15.  Some of these
opcodes are geared towards parsing like `BC` (String Match Branch).  Its behavior is best understood by
looking at a specific use case, like its first appearance in the "Original Tiny Basic Intermediate Interpreter"
on page 35.  Bytes 13-16 read

    000D ;      17 .  STATEMENT EXECUTOR
    000D ;      18 .
    000D ;      19 :STMT BC GOTO "LET"
    000D 8B4C45D4;

The first byte, `0x8B`, gets interpretered as `0x80` (the [opcode](https://en.wikipedia.org/wiki/Opcode) for `BC`)
plus `0x0B` to jump 11 bytes ahead if the user program does not match the string encoded in the following
bytes.  The next byte, `0x4C` is simply the [ASCII](https://en.wikipedia.org/wiki/ASCII) encoding for `'L'`.
`0x45` similarly means `'E'` but `0xD4` is not `'T'`.  The ASCII encoding for `'T'` is `0x54`.  `0xD4` encodes an
additional (literal) bit of information, namely that this is the last character to match in the user code.
`0xD4` is `'L' + 2⁷`.  And sure enough, bytes 25-30 read

    0019 ;      27 :GOTO BC PRNT "GO"
    0019 9447CF;
    001C ;      28       BC GOSB "TO"
    001C 8854CF;

Tiny BASIC is getting quite cute here.  It matches `"GOTO"` as `"GO"` + `"TO"` so it can try `"GOSUB"` next
if the first segment matched but not the second one, like a [radix tree](https://en.wikipedia.org/wiki/Radix_tree).

A good exercise to appreciate how much thought went into the design of TBIL is to write an
[assembler for it](https://github.com/jburgy/blog/blob/master/TinyBasic/assembler.py).
That assembler must recognize opcodes that are followed by an argument, like branches (`BR`, `BV`, `BN`, `BE`, `BC`),
jumps (`JS` and `J`), loads (`LB` and `LN`), and `SX`.  Most of them combine themselves with (the first byte of)
their argument. In the case of loaders, the argument follows.  The inner loop could looks something like this:

```python
        if op is OpCode.SX:
            out.append(int(op) + int(arg))
        elif op is OpCode.LB:
            out.append(int(op))
            out.append(int(arg))
        elif op is OpCode.LN:
            out.append(int(op))
            out.extend(struct.pack(">H", eval(arg)))
        elif op >= OpCode.BR:
            offset = offsets.get(arg, here + 1) - (here + 1)
            if op is OpCode.BR:
                offset += 0x20
            out.append(int(op) + offset)
        elif op >= OpCode.JS:
            target = struct.pack(">H", offsets.get(arg, 0))
            out.append(int(op) + target[0])
            out.extend(target[1:])
        else:
            out.append(int(op))
```

Those two calls to `struct.pack(">H", ...)` determine the Tiny BASIC's 
[endianness](https://en.wikipedia.org/wiki/Endianness).  Tom picked big-endian while
WASM is little-endian for [portability](https://webassembly.org/docs/portability/).
I initially convinced myself that endianness didn't matter as long as the virtual
machine was consistent.  I was wrong because of `LN`, `JS`, and `J`!

Another interesting aspect of TBIL is that it, like most assembly, requires two passes.  The first pass constructs
an incomplete byte stream and records the positions of labels. The second pass is identical to the first except it
can compute jump offsets correctly from those positions. As a matter of fact, the outer loop of our assembler looks like

```python
offsets = {}
for _ in range(2):  # first pass to compute offsets
    out = bytearray()
    for j, line in enumerate(interpreter[1:].splitlines()):
        ...
```

Converting TBIL text to bytes might strike some readers as one low-level step too far. However, this
[two-bit history post](https://twobithistory.org/2018/11/12/cat.html) reminds us of a (fortunately)
distant past where assemblers were the first piece of software developers had to create before using a new machine.
Can you imagine feverishly unboxing your brand new laptop only to discover that it only understand
[hex](https://en.wikipedia.org/wiki/Hexadecimal)? 

<div id="terminal"></div>
<script src="https://cdn.jsdelivr.net/npm/xterm@4.17.0/lib/xterm.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/xterm-pty@0.9.4/index.js"></script>
<script>
    const xterm = new Terminal();
    xterm.open(document.getElementById("terminal"));

    const { master, slave } = openpty();
    xterm.loadAddon(master);

    const worker = new Worker("/assets/js/TinyBasic.worker.js");
    new TtyServer(slave).start(worker);
</script>
