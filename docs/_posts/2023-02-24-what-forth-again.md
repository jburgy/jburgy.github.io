---
layout: post
title:  "What, Forth, Again?"
date:   2023-02-24 06:43:57 -0500
---

We already discussed [Chuck Moore](https://en.wikipedia.org/wiki/Charles_H._Moore)'s 
[discovery](https://news.ycombinator.com/item?id=18227631) of [FORTH](https://colorforth.github.io/HOPL.html)
in a [previous post](/2022/05/28/what-is-forth.html) but leveraging python bytecodes felt a lot like
cheating.  Like many others, I started understanding FORTH through Richard VM Jones'
[jonesforth](https://rwmj.wordpress.com/2010/08/07/jonesforth-git-repository/).  I trudged through
the unfamiliar assembly syntax and settled down with many cups of coffee to underestand the difference
between direct and indirect [threaded code](http://home.claranet.nl/users/mhx/Forth_Bell.pdf).  And yet, after
all this time, I realized I didn't really understand it.  So I decided to translate 
[jonesforth.S](http://home.claranet.nl/users/mhx/Forth_Bell.pdf) to 
[C](https://en.wikipedia.org/wiki/C_(programming_language)).

The first bit of actual code in `jonesforth.S` is the `NEXT` macro:
```nasm
	.macro NEXT
	lodsl
	jmp *(%eax)
	.endm
```
`NEXT` is fundamental to `FORTH` and remarkably only requires two x86 instructions.  The second instruction
reminds us of [What makes Julia delightful, cont'd?](/2022/05/26/what-makes-julia-delightful.html)  The
wikipedia [entry on threaded code](https://en.wikipedia.org/wiki/Threaded_code) outlines a rather vast array
of potential translations.  However, in the spirit of keeping our translation as faithful to the original as
possible, I chose [GNU C's Labels as Values](https://gcc.gnu.org/onlinedocs/gcc/Labels-as-Values.html). This
is what my `NEXT` macro looks like in C:
```c
#define NEXT do { target = *ip++; goto **target; } while (0)
```
Checking the generated assembly (using [-fverbose-asm](https://renenyffenegger.ch/notes/development/languages/C-C-plus-plus/GCC/options/f/verbose-asm)),
we see that GCC always translates `goto **target` to
```nasm
    movq    (%rdx), %rax
    jmp     *%rax
```
so that looks rather promising.  GCC's [register allocation](https://gcc.gnu.org/wiki/RegisterAllocation) logic
means that the line which immediately precedes these instructions can vary greatly.  `ip` is not always kept in
the same register.  Fortunately, we don't need to worry about that.

With this first challenge behind us, we move on to the precise memory layout of FORTH 
[dictionary entries](https://en.wikipedia.org/wiki/Forth_(programming_language)#Dictionary_entry).  FORTH words
can vary in length.  Words written in assembly (or in our case C) language only require a single address.  Words
written in FORTH can refer to `N` previously defined words plus the special `DOCOL` label (since they were
introduced by a `:`) that is at the center of _indirect_ threading.  Jones explains that extra indirection step
in great details, complete with ASCII diagrams.  I will therefore not repeat it here.
[Flexible array members](https://en.wikipedia.org/wiki/Flexible_array_member) were officially standardized
in [C99](https://en.wikipedia.org/wiki/C99) so we will use them to store the collection of labels in the dictionary
entry.  We could store the first label, aka `Code Field`, as a separate member but that only increases the
cognitive load of remembering that following parameters are contiguous.  `jonesforth.S` words actually contain
not one but _two_ flexible arrays (`name` and `code`) where C only allows one.  That's our first big deviation
from `jonesforth.S` (there will be more, don't worry):
```c
struct word_t {
    struct word_t *link;
    char flags;
    char name[15] __attribute__((nonstring));  /* big enough for builtins, forth words might overflow  */
    void *code[];
};
```
Looking at all the words written in assembly, the longest name (`"O_NONBLOCK"`) is 11 characters long.  Assuming
8 bytes per word, we need two words to encode it.  That explains how `name[15]` was chosen.  It's marginally wasteful
on 32 bit chips (where words only occupy 4 bytes) but lets us get away with one fewer `__SIZEOF_POINTER__` conditional.
Note that this choice doesn't impose a 15 character limit on FORTH words _provided_ our code never accesses the `.code`
member directly and respects `.flags & F_LENMASK` instead.  We introduced `code_field_address(word)` for convenience.

I can honestly say that I have never written code with a higher bug density before this.  Every tiny little detail
matters, particularly when testing some of the more advanced FORTH words like `CFA>` and `SEE`.  Things mostly work
right now but I wouldn't trust it for [space exploration](https://groups.google.com/g/alt.folklore.science/c/gRF-EyF-1rM).

Less generous readers are sure to ask: "are you happy now, what was the point of it all?"  One of the cool things
having this code in C lets us do is use [emscripten](https://emscripten.org/) to build it for the web!  Emscripten is
based on the [Clang](https://clang.llvm.org/)/[LLVM](https://llvm.org/) stack,
not [GCC](https://gcc.gnu.org/)/[libgccjit](https://gcc.gnu.org/wiki/JIT).  Another GCC extension my code relies on,
which I didn't bother to mention, are [Nested Functions](https://gcc.gnu.org/onlinedocs/gcc/Nested-Functions.html) to
push on and pop from the data stack.  This led me to discover Clang's [Blocks](https://en.wikipedia.org/wiki/Blocks_(C_language_extension)).
The wikipedia is more advanced than strictly necessary but still incredibly useful.  The basic syntax is reasonably intuitive:
```c
    intptr_t (^pop)(void) = ^(void)
    {
        assert(sp < stack + STACK_SIZE);
        return *sp++;
    };
```
This might also be a good time to point out that our stacks grow downwards to match x86 `push`/`pop` conventions.

Then I hit an [issue](https://github.com/emscripten-core/emscripten/issues/6708) where emscripten decided not to
implement [syscall(2)](https://man7.org/linux/man-pages/man2/syscall.2.html).  I threw a simplistic
[shim](https://en.wikipedia.org/wiki/Shim_(computing)) together and moved on.  Finally, I wrapped the whole thing
in a thin [xterm-pty](https://xterm-pty.netlify.app/) layer and got a rather more heterogeneous clone of
[WAForth](https://el-tramo.be/blog/waforth/).  

{::comment}
# Many thanks to [stefnotch](https://github.com/stefnotch) for
# explaining how a [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) lets us
# access the required [SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)
# on [github pages](https://stefnotch.github.io/web/COOP%20and%20COEP%20Service%20Worker/)
{:/comment}

<div id="terminal"></div>
<script src="https://cdn.jsdelivr.net/npm/xterm@4.17.0/lib/xterm.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/xterm-pty@0.9.4/index.js"></script>
<script>
    const xterm = new Terminal();
    xterm.open(document.getElementById("terminal"));

    const { master, slave } = openpty();
    xterm.loadAddon(master);

    const worker = new Worker("/assets/js/4th.worker.js");
    const server = new TtyServer(slave);

    fetch("https://raw.githubusercontent.com/nornagon/jonesforth/master/jonesforth.f")
        .then((response) => response.arrayBuffer())
        .then((buffer) => {
            server.toWorkerBuf.push(...new Uint8Array(buffer));
            server.start(worker);
        });
</script>
