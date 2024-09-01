---
layout: post
title:  "Why not try zig next?"
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
But things rarely go as you with they would.  Which brings us to our first challenge:

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
```c
const Word = extern struct {
    link: ?*const Word,
    flag: u8,
    name: [@intFromEnum(Flag.LENMASK)]u8 align(1),
};

const Instr = packed union {
    code: *const fn (*Interp, []isize, [][*]const Instr, [*]const Instr, [*]const Instr) anyerror!void,
    literal: isize,
    word: [*]const Instr,
};

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
    @memset(p.name[name.len..@intFromEnum(Flag.LENMASK)], 0);
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
to the word itself or compute the number of instructions in a word.

We used one more `comptime` trick to keep our code [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself): abusing `struct` to create
[closures](https://gencmurat.com/en/posts/zig-anonymus-functions-and-closures/).
This let us implement `+` as
```c
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
[5th.zig](https://github.com/jburgy/blog/blob/master/fun/5th.zig) mostly works.
It executes the bootstrapping FORTH code that adds control structures, strings,
introspection, and a bunch of other goodies.  I don't love how I skirted
memory allocation.  I would prefer
[SbrkAllocator](https://github.com/ziglang/zig/blob/master/lib/std/heap/sbrk_allocator.zig)
to support `MORECORE` seamlessly.  It would also be neat to generate a 
[WebAssembly](https://webassembly.org/) build to include on this page.  Finally,
this is my first ever Zig code.  The compiler and VSCode language server
already act as style guides but I would appreciate feedback from experienced
Zig devs.  
