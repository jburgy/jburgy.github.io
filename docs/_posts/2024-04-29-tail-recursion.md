---
layout: post
title:  "What is Tail Call Elimination?"
date:   2024-03-29 08:00:07 -0500
giscus: https://giscus.jburgy.workers.dev/client.js
---

Previous posts highlight my interest in (obsession with?) interpreters.  I keep marveling at
techniques people have come up with over the years to make our interactions with computers feel conversational.
I was recently reminded of [Guy Steele](https://en.wikipedia.org/wiki/Guy_L._Steele_Jr.)'s seminal 
[Lambda: The Ultimate GOTO](https://en.wikisource.org/wiki/Lambda:_The_Ultimate_GOTO)
article.  Around the same time, I came across old release notes for
[Clang 13.0.0](https://releases.llvm.org/13.0.0/tools/clang/docs/ReleaseNotes.html) announcing, among other things, a
[musttail attribute](https://clang.llvm.org/docs/AttributeReference.html#musttail).  This immediately reminded me
of my decision to use [GNU's labels as values](https://gcc.gnu.org/onlinedocs/gcc/Labels-as-Values.html) to implement
[jonesforth in C]({% post_url 2023-02-24-what-forth-again %}).  Naturally, I started wondering what a FORTH
implemented in C would look like with `goto` replaced by `musttail`.  A quick google search turned up
a public [gist](https://gist.github.com/snej/9ba59d90689843b22dc5be2730ef0d49/2d55f844b7622aa117b9275bbc9d189613f7ff7f)
by [Jens Alfke](https://gist.github.com/snej).  As an aside, I didn't notice Jens's more elaborate
[Tails](https://github.com/snej/tails/) project until later.

The first step to migrating from `goto` to `musttail` is to abandon all the `void **` (and occasional `void ***` because
of [indirect threading](https://en.wikipedia.org/wiki/Threaded_code#Indirect_threading)) in favor of explicit
types.  I adapted the union below from Jens:

```c
union instr_t {
    intptr_t *(*code)(struct interp_t *, intptr_t *, union instr_t **, union instr_t *, union instr_t *);
    intptr_t literal;
    union instr_t *word;
};
```

A FORTH instruction is either an address to a function with a complicated signature (more on that later),
a literal word (branching instructions encode their offsets directly in the instruction stream), or a pointer
to an instruction (for indirect threading).  Let's pick one example apart

```c
intptr_t *SWAP(struct interp_t *, intptr_t *, union instr_t **, union instr_t *, union instr_t *);
static struct word_t name_SWAP __attribute__((used)) = {
    .link = &name_DROP,
    .flag = 4,
    .name = "SWAP",
    .code = {.code = SWAP}
};
intptr_t *SWAP(struct interp_t *env, intptr_t *sp, union instr_t **rsp, union instr_t *ip, union instr_t *target __attribute__((unused)))
{
    register intptr_t tmp = sp[1];
    sp[1] = sp[0];
    sp[0] = tmp;
    __attribute__((musttail)) return ip->word->code(env, sp, rsp, ip + 1, ip->word)
}
```

This example begins with a [forward declaration](https://en.wikipedia.org/wiki/Forward_declaration) of
the `SWAP` function so we can include it in the `name_SWAP` struct.  That struct is part of the
[singly linked list](https://en.wikipedia.org/wiki/Linked_list#Singly_linked_list) that implements the
FORTH [vocabulary](https://www.forth.com/starting-forth/11-forth-compiler-defining-words/).
The `name_*` structs let the FORTH interpreter/compiler associate textual names of FORTH words
with their implementations.  That logic lives in `INTERPRET` which invokes `WORD` to
recognize user input then either appends to the word being compiled or transfers control when
in interpreter mode.  `STATE` distinguishes between interpreter and compiler mode.  By convention,
`INTERPRET` also tries to interpret strings it couldn't map to words as literal numbers.  If it
fails, it emits an error message and moves on to the next token.  This illustrates FORTH parsimony:
no tokenizer, lexer, or syntax tree.  FORTH is a [WYSIWYG](https://en.wikipedia.org/wiki/WYSIWYG) language.

Performance specialists might worry that hot functions with so many parameters will challenge
clang's [register allocation](https://en.wikipedia.org/wiki/Register_allocation).  Fortunately,
those functions will never be called by a
[CALL instruction](https://www.quora.com/What-does-the-call-instruction-do-in-an-assembly-language)!
The parameters are as follow

> `struct interp_t *env`

A number of interpreter global variables like `BASE`, `STATE` (whether we're compiling or interpreting), `HERE`

> `intprt_t *sp`

A pointer to the top of the value stack.  Both stacks grow downward

> `union instr_t **rsp`

A pointer to the top of the return stack

> `union instr_t *ip`

A pointer to the _next_ instruction.  Because we're using indirect threading, `ip->code` rarely makes
sense, only `ip->literal` and `ip->word` do. 

> `union instr_t *target`

A pointer to the _current_ instruction.  Used by `DOCOL` to transfer control to the next word.
Having it as rightmost argument is reminiscent of
[continuation-passing style](https://en.wikipedia.org/wiki/Continuation-passing_style).  If anything,
having so many parameters simplifies clang's register allocation as the 
[System V ABI](https://en.wikipedia.org/wiki/X86_calling_conventions#System_V_AMD64_ABI) mandates that
the first six integer or pointer arguments are passed in registers `%rdi`, `%rsi`, `%rdx`, `%rcx`,
`%r8`, and `%r9`.


All word initializers start with a forward declaration so the first eight lines (before the
last opening curly) can be generated by a [preprocessor macro](https://gcc.gnu.org/onlinedocs/cpp/Macros.html).
A previous version injected the code (from the last opening to the end) as a macro argument.  This
made for a sub-optimal debugging experience since macros expand everything into a single line.
The macro version of `SWAP` looks much tidier, like this:

```c
DEFCODE(DROP, 0, "SWAP", SWAP)
{
    register intptr_t tmp = sp[1];
    sp[1] = sp[0];
    sp[0] = tmp;
    NEXT;
}
```

Amazingly, the [x86](https://en.wikipedia.org/wiki/X86) version of `SWAP` is barely longer than the c version:

```nasm
SWAP:                           # @SWAP
    movdqu  (%rsi), %xmm0
    pshufd  $78, %xmm0, %xmm0   # xmm0 = xmm0[2,3,0,1]
    movdqu  %xmm0, (%rsi)
    movq    (%rcx), %r8         # target = ip->word
    movq    (%r8), %rax         # rax = target->code
    addq    $8, %rcx            # ip + 1
    jmpq    *%rax               # TAILCALL
```

The first three lines actually swap `sp[0]` and `sp[1]` (using `pshufd` to
[shuffle packed doublewords](https://www.felixcloutier.com/x86/pshufd)).
The last four lines dereference `ip` _twice_ (_indirect_ threading)
the perform the tail call using an [indirect branch](https://en.wikipedia.org/wiki/Indirect_branch).
Staring at that generated assembly highlights a clever bit of
[code golf](https://en.wikipedia.org/wiki/Code_golf) in 
[Richard WM Jones](https://rwmj.wordpress.com/)'s handcrafted 
[jonesforth.S](https://github.com/nornagon/jonesforth/blob/master/jonesforth.S):
he condensed the last 4 instructions above into just 2 
(`lodsl` is equivalent to `mov (%esi), %eax; add $4, %esi` while
`jmp *(%eax)` is equivalent to `mov (%eax), %eax; jmp *%eax`)!
[97e00d7](https://github.com/jburgy/blog/blob/97e00d7795ee0c97cbea901aae46d98a7bb5ebf5/fun/5th.c)
is a (failed) attempt at using [extended asm](https://gcc.gnu.org/onlinedocs/gcc/Extended-Asm.html)
to achieve the same compression.  Unfortunately, I found no better way to enforce
pre-conditions than explicit `mov` instructions (which more than offset the saving).

The [webassembly](https://webassembly.org/) version, courtesy of
[wasm2wat](https://webassembly.github.io/wabt/demo/wasm2wat/), is only slightly longer:
```scheme
(module $5th.wasm
  (type $t0 (func (param i32 i32 i32 i32 i32) (result i32)))
  ...
  (func $SWAP (type $t0) (param $p0 i32) (param $p1 i32) (param $p2 i32) (param $p3 i32) (param $p4 i32) (result i32)
    (i64.store align=4
      (local.get $p1)
      (i64.rotl
        (i64.load align=4
          (local.get $p1))
        (i64.const 32)))
    (return_call_indirect (type $t0)
      (local.get $p0)
      (local.get $p1)
      (local.get $p2)
      (i32.add
        (local.get $p3)
        (i32.const 4))
      (local.tee $p3
        (i32.load
          (local.get $p3)))
      (i32.load
        (local.get $p3))))
  ...
)
```

In summary, [`5th.c`](https://github.com/jburgy/blog/blob/main/forth/5th.c) looks
different from [`4th.c`](https://github.com/jburgy/blog/blob/main/forth/4th.c), at least
when considering their C sources. Turns out that compilers generate very similar code
from those difference sources.  That code is also reminiscent of
[jonesforth.S](https://github.com/nornagon/jonesforth/blob/master/jonesforth.S)
which was hand-crafted in 32-bit x86.  `5th.c` is probably the easiest to extend
of the bunch.  New native instructions only require implementing a new C function with
a well-defined signature.  It might be the
[shiny object syndrome](https://en.wikipedia.org/wiki/Shiny_object_syndrome) but think that
[`5th.c`](https://github.com/jburgy/blog/blob/main/forth/5th.c) is a reasonable
[blueprint](https://en.wikipedia.org/wiki/Blueprint) for implementing your next interpreter. 

<div id="terminal"></div>
<script type="module">
    import "/blog/node_modules/@xterm/xterm/lib/xterm.js";
    import { openpty } from "/blog/node_modules/xterm-pty/index.mjs";
    import initEmscripten from "/blog/5th.mjs";

    const xterm = new Terminal();
    xterm.open(document.getElementById("terminal"));

    const { master, slave } = openpty();
    xterm.loadAddon(master);

    const response = await fetch("/blog/jonesforth.f");
    const preamble = new Uint8Array(await response.arrayBuffer());
    slave.ldisc.toUpperBuf.push(...preamble);

    await initEmscripten({ pty: slave });
    slave.ldisc.flushToUpper();
</script>
