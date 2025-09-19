---
layout: post
title:  "Why not try Zig next?"
date:   2024-08-31 07:41:26 -0500
---

As this blog shows, I am deeply interested in interpreters.  I find the meta
nature of programs that run programs fascinating.  That said, I am also too
lazy to care for the fiddly bookkeeping needed to write a robust parser.  That
makes [FORTH](https://en.wikipedia.org/wiki/Forth_(programming_language))'s
complete lack of syntax particularly appealing (look ma, no parser)!

I first experimented with FORTH as mere shorthand to 
[generate python bytecode]({% post_url 2022-05-28-what-is-forth %}),
then translated [jonesforth]({% post_url 2023-02-24-what-forth-again %}) 
from x86 to GNU C with [labels as values](https://gcc.gnu.org/onlinedocs/gcc/Labels-as-Values.html),
and finally to C with [tail recursion]({% post_url 2024-04-29-tail-recursion %}).
You would think that would be enough, wouldn't you.

Yet somehow that itch still needed scratching.  I also thought it was time to
learn a new programming language that would accommodate my most recent
implementation.  I obviously thought of [Rust](https://www.rust-lang.org/)
first because of all the buzz but [#81](https://github.com/rust-lang/rfcs/pull/81)
put the kibosh on that idea.  [Zig](https://ziglang.org/) seemed a natural choice
as well, particularly because of the "better C than C" tagline.  And `Zig` supports
an [`.always_tail`](https://ziglang.org/documentation/master/#call) call modifier!

Alright then, porting a C program that uses `musttail` to a "better C than C" that
supports `.always_tail` should be
[like shooting fish in a barrel](https://en.wiktionary.org/wiki/like_shooting_fish_in_a_barrel).
But things rarely go as you wish they would.  Which brings us to our first challenge:

## Macros

Besides the excellent literate comments, [Richard WM Jones](https://rwmj.wordpress.com/)
made liberal use of [gas](https://en.wikipedia.org/wiki/GNU_Assembler) `.macro` to
keep his x86 code readable.  Let that sink in: readable x86 is no small feat!  That
influenced me to rely heavily on the [C preprocessor](https://en.wikipedia.org/wiki/C_preprocessor)
in my C translations.  Case in point: in `jonesforth.s`, the `+` primitive is
defined by

```nasm
    defcode "+",1,,ADD
    pop %eax            # get top of stack
    addl %eax,(%esp)	# and add it to next word on stack
    NEXT
```

which expands (transitively) to

```nasm
    .section .rodata
    .align 4
    .globl name_ADD
name_ADD :
    .int link           # link to previous word (name_DECR4)
    .set link,name_ADD
    .byte 1             # flags + length byte
    .ascii "+"		# the name
    .align 4		# padding to next 4 byte boundary
    .globl ADD
ADD :
    .int code_ADD	# codeword
    .text
    //.align 4
    .globl code_ADD
code_ADD :
    pop %eax		# get top of stack
    addl %eax,(%esp)    # and add it to next word on stack
    lodsl               # NEXT
    jmp *(%eax)
```

Wof.  Which version do you prefer reading?  I, for one, am glad to not
be constantly reminded of all these alignment directives.  For comparison,
my second C implementation's `+` primitive looks like this

```c
DEFCODE(DECRP, 0, "+", ADD) 
{
    sp[1] += sp[0];
    ++sp;
    NEXT;
}
```

Neat and tidy, right.  Unfortunately, this also expands into the gorier

```c
intptr_t *ADD(  /* forward declaration */
    struct interp_t *,
    intptr_t *,
    union instr_t **,
    union instr_t *,
    union instr_t *,
);
static struct word_t name_ADD __attribute__((used)) = {
    .link = &name_DECRP,
    .flag = 0 | ((sizeof "+") - 1),
    .name = "+",
    .code = {.code = ADD}
};
intptr_t *ADD(
    struct interp_t *env,
    intptr_t *sp,
    union instr_t **rsp,
    union instr_t *ip,
    union instr_t *target __attribute__((unused)),
)
{
    sp[1] += sp[0];
    ++sp;
    __attribute__((musttail)) return ip->word->code(env, sp, rsp, ip + 1, ip->word);
}
```

Macros are great for hiding [boilerplate](https://en.wikipedia.org/wiki/Boilerplate_code).

Yet Zig proudly _eschewed_ preprocessor and macros!  It's right there on the
[front page](https://ziglang.org/):

* No hidden control flow.
* No hidden memory allocations.
* No preprocessor, no macros.

Oh no, what are we going to do!?  Fear not friends, for Zig offers
[`comptime`](https://ziglang.org/documentation/master/#comptime)!
(It took me a while to wrap my head around `comptime` but when I did, 
I found it poetic to implement an interpreter that also compiles using
a compiler that also interprets).  My mental model for Zig's `comptime`-based
[metaprogramming](https://en.wikipedia.org/wiki/Metaprogramming) is that Zig
will eagerly resolve expressions that are "known at compile-time".  This
reminds me very much of good ole C++
[template metaprogramming](https://en.wikipedia.org/wiki/Template_metaprogramming)
except Zig doesn't restrict you to an esoteric
[DSL](https://en.wikipedia.org/wiki/Domain-specific_language).  No, Zig gives
you access to the entire language syntax for compile-time expressions subject
to static constraints.

We need to discuss another Zig limitation before exploring how `comptime`
saved us from the preprocessor quagmire.  If Zig supports 
[flexible array members](https://www.reddit.com/r/Zig/comments/sr7p3f/does_zig_support_flexible_array_members/),
then I wasn't smart enough to make them work.  But Zig does have a very
[friendly and helpful community](https://discord.com/channels/605571803288698900/1274691126833578087)
who gave me pointers (pun intended) to help me _reframe_ my approach:
instead of implementing FORTH words as a `struct` with an array of instructions
bolted to the end, let's use an array of instructions whose first few (5 to be
precise) entries are hijacked to represent a `struct`.  You might recall that
FORTH implementations have an [association list](https://en.wikipedia.org/wiki/Association_list)
at their core.  `name_ADD` in the snippets above represents one node of
that association list, keyed by `"+"` and linked to `name_DECR4`.

In Zig, preprocessor macros are replaced by a handful of comptime functions
which all ultimately call
```zig
const Word = extern struct {
    link: ?*const Word,
    flag: u8,
    name: [F_LENMASK]u8 align(1),
};

const Instr = packed union {
    code: *const fn (*Interp, []isize, [][*]const Instr, [*]const Instr, [*]const Instr) anyerror!void,
    literal: isize,
    word: [*]const Instr,
};

const offset = @divTrunc(@sizeOf(Word), @sizeOf(Instr));

fn defword_(
    comptime last: ?[]const Instr,
    comptime flag: Flag,
    comptime name: []const u8,
    comptime code: []const Instr,
) [offset + code.len]Instr {
    var instrs: [offset + code.len]Instr = undefined;
    const p: *Word = @ptrCast(&instrs[0]);
    p.link = if (last == null) null else @ptrCast(last.?.ptr);
    p.flag = name.len | @intFromEnum(flag);
    @memcpy(p.name[0..name.len], name);
    @memset(p.name[name.len..F_LENMASK], 0);
    @memcpy(instrs[offset..], code);
    return instrs;
}
```
[`@ptrCast`](https://ziglang.org/documentation/master/#ptrCast) lets us
treat the first `instrs[0..offset]` as a `Word`.  Zig lets you get away
with that because [it's just bytes all the way down](https://discord.com/channels/605571803288698900/1254033012299927573/1254039887703969794).

You're probably wondering why I'm willing to abuse Zig's semantics to
guarantee this very specific memory layout.  I'm doing this to respect as many
details of the [jonesforth](https://github.com/nornagon/jonesforth) implementation
as possible in order to make fiddly words like `CFA>` and `ID.` work.  Those
meta words exploit the precise memory layout to go from a word's first instruction
to the word itself as well as compute the number of instructions in a word.

We used one more `comptime` trick to keep our code [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself): abusing `struct` to create
[closures](https://gencmurat.com/en/posts/zig-anonymus-functions-and-closures/).
This let us implement `+` as
```zig
inline fn _add(sp: []isize) ![]isize {
    sp[1] += sp[0];
    return sp[1..];
}
const add = defcode(&decrp, "+", _add);
```
which is somewhat reminiscent of the C implementation above.  Note that `sp`
is a [slice](https://ziglang.org/documentation/master/#Slices) which gives the
Zig compiler an opportunity to generate bound checks.

## Next steps
[6th.zig](https://github.com/jburgy/blog/blob/main/forth/6th.zig) mostly works.
It executes the bootstrapping FORTH code that adds control structures, strings,
introspection, and a bunch of other goodies.  I don't love how I skirted
memory allocation.  I would prefer switching to
[SbrkAllocator](https://github.com/ziglang/zig/blob/master/lib/std/heap/sbrk_allocator.zig)
and support `MORECORE` seamlessly.  It would also be neat to generate a 
[WebAssembly](https://webassembly.org/) build to include on this page.  Finally,
this is my first ever Zig code.  The compiler and VSCode language server
already act as style guides but I would appreciate feedback from experienced
Ziguanas.  

## Bonus material

Richard WM Jones added some pretty fantastic [ASCII art](https://en.wikipedia.org/wiki/ASCII_art)
to his literate x86 jonesforth.  Turns out [Svgbob](https://ivanceras.github.io/svgbob-editor/)
does a really good job of converting them to 
[SVG](https://en.wikipedia.org/wiki/SVG).  Here's the diagram Richard uses to explain
[indirect threading](https://en.wikipedia.org/wiki/Threaded_code#Indirect_threading):

<svg xmlns="http://www.w3.org/2000/svg" width="736" height="416" class="svgbob"><style>.svgbob line, .svgbob path, .svgbob circle, .svgbob rect, .svgbob polygon {
    stroke: black;
    stroke-width: 2;
    stroke-opacity: 1;
    fill-opacity: 1;
    stroke-linecap: round;
    stroke-linejoin: miter;
}
.svgbob text {
    white-space: pre;
    fill: black;
    font-family: Iosevka Fixed, monospace;
    font-size: 14px;
}
.svgbob rect.backdrop {
    stroke: none;
    fill: white;
}
.svgbob .broken {
    stroke-dasharray: 8;
}
.svgbob .filled {
    fill: black;
}
.svgbob .bg_filled {
    fill: white;
    stroke-width: 1;
}
.svgbob .nofill {
    fill: white;
}
.svgbob .end_marked_arrow {
    marker-end: url(#arrow);
}
.svgbob .start_marked_arrow {
    marker-start: url(#arrow);
}
.svgbob .end_marked_diamond {
    marker-end: url(#diamond);
}
.svgbob .start_marked_diamond {
    marker-start: url(#diamond);
}
.svgbob .end_marked_circle {
    marker-end: url(#circle);
}
.svgbob .start_marked_circle {
    marker-start: url(#circle);
}
.svgbob .end_marked_open_circle {
    marker-end: url(#open_circle);
}
.svgbob .start_marked_open_circle {
    marker-start: url(#open_circle);
}
.svgbob .end_marked_big_open_circle {
    marker-end: url(#big_open_circle);
}
.svgbob .start_marked_big_open_circle {
    marker-start: url(#big_open_circle);
}<!--separator--></style><defs><marker id="arrow" viewBox="-2 -2 8 8" refX="4" refY="2" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><polygon points="0,0 0,4 4,2 0,0"></polygon></marker><marker id="diamond" viewBox="-2 -2 8 8" refX="4" refY="2" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><polygon points="0,2 2,0 4,2 2,4 0,2"></polygon></marker><marker id="circle" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><circle cx="4" cy="4" r="2" class="filled"></circle></marker><marker id="open_circle" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><circle cx="4" cy="4" r="2" class="bg_filled"></circle></marker><marker id="big_open_circle" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><circle cx="4" cy="4" r="3" class="bg_filled"></circle></marker></defs><rect class="backdrop" x="0" y="0" width="736" height="416"></rect><text x="2" y="12" >:</text><text x="18" y="12" >QUADRUPLE</text><text x="98" y="12" >DOUBLE</text><text x="154" y="12" >DOUBLE</text><text x="210" y="12" >;</text><text x="18" y="60" >codeword</text><text x="18" y="92" >addr</text><text x="58" y="92" >of</text><text x="82" y="92" >DOUBLE</text><line x1="144" y1="88" x2="264" y2="88" class="solid"></line><polygon points="264,84 272,88 264,92" class="filled"></polygon><text x="18" y="124" >addr</text><text x="58" y="124" >of</text><text x="82" y="124" >DOUBLE</text><text x="18" y="156" >addr</text><text x="58" y="156" >of</text><text x="82" y="156" >EXIT</text><text x="282" y="60" >:</text><text x="298" y="60" >DOUBLE</text><text x="354" y="60" >DUP</text><text x="386" y="60" >+</text><text x="402" y="60" >;</text><text x="298" y="108" >codeword</text><text x="298" y="140" >addr</text><text x="338" y="140" >of</text><text x="362" y="140" >DUP</text><line x1="408" y1="136" x2="520" y2="136" class="solid"></line><polygon points="520,132 528,136 520,140" class="filled"></polygon><text x="298" y="172" >addr</text><text x="338" y="172" >of</text><text x="362" y="172" >+</text><text x="298" y="204" >addr</text><text x="338" y="204" >of</text><text x="362" y="204" >EXIT</text><polygon points="520,276 528,280 520,284" class="filled"></polygon><text x="554" y="156" >codeword</text><text x="554" y="188" >assembly</text><text x="626" y="188" >to</text><polygon points="680,180 672,184 680,188" class="filled"></polygon><text x="554" y="204" >implement</text><text x="634" y="204" >DUP</text><text x="578" y="220" >..</text><text x="554" y="236" >NEXT</text><text x="218" y="172" >%esi</text><line x1="256" y1="168" x2="264" y2="168" class="solid"></line><polygon points="264,164 272,168 264,172" class="filled"></polygon><text x="554" y="300" >codeword</text><text x="554" y="332" >assembly</text><text x="626" y="332" >to</text><polygon points="672,324 664,328 672,332" class="filled"></polygon><text x="554" y="348" >implement</text><text x="634" y="348" >+</text><text x="578" y="364" >..</text><text x="554" y="380" >NEXT</text><g><line x1="4" y1="40" x2="156" y2="40" class="solid"></line><line x1="4" y1="40" x2="4" y2="168" class="solid"></line><line x1="156" y1="40" x2="156" y2="72" class="solid"></line><line x1="4" y1="72" x2="156" y2="72" class="solid"></line><line x1="4" y1="104" x2="156" y2="104" class="solid"></line><line x1="156" y1="104" x2="156" y2="168" class="solid"></line><line x1="4" y1="136" x2="156" y2="136" class="solid"></line><line x1="4" y1="168" x2="156" y2="168" class="solid"></line></g><g><line x1="284" y1="88" x2="436" y2="88" class="solid"></line><line x1="284" y1="88" x2="284" y2="216" class="solid"></line><line x1="436" y1="88" x2="436" y2="120" class="solid"></line><line x1="284" y1="120" x2="436" y2="120" class="solid"></line><line x1="284" y1="152" x2="436" y2="152" class="solid"></line><line x1="284" y1="184" x2="436" y2="184" class="solid"></line><line x1="436" y1="184" x2="436" y2="216" class="solid"></line><line x1="284" y1="216" x2="436" y2="216" class="solid"></line></g><g><line x1="408" y1="168" x2="476" y2="168" class="solid"></line><line x1="476" y1="168" x2="476" y2="280" class="solid"></line><line x1="476" y1="280" x2="520" y2="280" class="solid"></line></g><g><line x1="540" y1="136" x2="692" y2="136" class="solid"></line><line x1="540" y1="136" x2="540" y2="248" class="solid"></line><line x1="540" y1="168" x2="692" y2="168" class="solid"></line><line x1="692" y1="192" x2="692" y2="248" class="solid"></line><line x1="540" y1="248" x2="692" y2="248" class="solid"></line></g><g><line x1="664" y1="152" x2="724" y2="152" class="solid"></line><line x1="724" y1="152" x2="724" y2="184" class="solid"></line><line x1="680" y1="184" x2="724" y2="184" class="solid"></line></g><g><line x1="540" y1="280" x2="692" y2="280" class="solid"></line><line x1="540" y1="280" x2="540" y2="392" class="solid"></line><line x1="540" y1="312" x2="692" y2="312" class="solid"></line><line x1="692" y1="336" x2="692" y2="392" class="solid"></line><line x1="540" y1="392" x2="692" y2="392" class="solid"></line></g><g><line x1="664" y1="296" x2="724" y2="296" class="solid"></line><line x1="724" y1="296" x2="724" y2="328" class="solid"></line><line x1="672" y1="328" x2="724" y2="328" class="solid"></line></g></svg>

## Update 1: 10/24/2024

I presented Zorth to the first NYC zig meetup!

[![ZORTH](http://img.youtube.com/vi/Bar4IFc1NpM/0.jpg)](https://www.youtube.com/watch?v=Bar4IFc1NpM "FORTH in Zig")

## Update 2: 11/12/2024

After much dragon fighting, I managed to [build zorth for the web](https://discord.com/channels/605571803288698900/1305550948713627669).  Enjoy!

<div id="terminal"></div>
<script type="module">
    import "/blog/node_modules/@xterm/xterm/lib/xterm.js";
    import { openpty } from "/blog/node_modules/xterm-pty/index.mjs";
    import initEmscripten from "/blog/6th.mjs";

    const xterm = new Terminal();
    xterm.open(document.getElementById("terminal"));

    const { master, slave } = openpty();
    xterm.loadAddon(master);

    const response = await fetch("https://raw.githubusercontent.com/nornagon/jonesforth/master/jonesforth.f");
    const preamble = new Uint8Array(await response.arrayBuffer());
    slave.ldisc.toUpperBuf.push(...preamble);

    await initEmscripten({ pty: slave });
    slave.ldisc.flushToUpper();
</script>
