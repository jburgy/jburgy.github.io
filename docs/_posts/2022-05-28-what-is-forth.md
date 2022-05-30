---
layout: post
title:  "What is Forth?"
date:   2022-05-28 12:01:36 -0500
categories: jekyll update
---
## Or How I Stopped Complaining about the CPython Bytecode Compiler?

Python is an interpreted language but that interpretation happens in two largely indepedent stages.  Python code is
first "compiled" to an intermediate bytecode representation.  That intermediate representation is then executed by a
[virtual machine](https://github.com/python/cpython/blob/main/Python/ceval.c).  The whole thing is quite fascinating
and I recommend Anthony Shaw's [CPython Internals](https://realpython.com/products/cpython-internals-book/) book if
you'd like to dig deeper.  This is not, however, the topic of this post.  This post is going to discuss what we can
do about the fact that the python compiler performs [barely any optimizations](https://nullprogram.com/blog/2019/02/24/).

There's no need to repeat Chris Wellons' arguments but an example will ground the conversation:

```python
def fibonacci(n: int) -> int:
    a, b = 1, 0
    while n:
        n -= 1
        a, b = a + b, a
    return a
```

The `dis` python standard library [module](https://docs.python.org/3/library/dis.html) lets you inspect how python
compiles that function:

```nasm
  2           0 LOAD_CONST               1 (1)
              2 STORE_FAST               1 (a)

  3           4 LOAD_CONST               2 (0)
              6 STORE_FAST               2 (b)

  4     >>    8 LOAD_FAST                0 (n)
             10 POP_JUMP_IF_FALSE       36

  5          12 LOAD_FAST                0 (n)
             14 LOAD_CONST               1 (1)
             16 INPLACE_SUBTRACT
             18 STORE_FAST               0 (n)

  6          20 LOAD_FAST                1 (a)
             22 LOAD_FAST                2 (b)
             24 BINARY_ADD
             26 LOAD_FAST                1 (a)
             28 ROT_TWO
             30 STORE_FAST               1 (a)
             32 STORE_FAST               2 (b)
             34 JUMP_ABSOLUTE            8

  7     >>   36 LOAD_FAST                1 (a)
             38 RETURN_VALUE
```

The first thing that stands out is the sheer number of `LOAD_FAST` and `STORE_FAST`.  It is not at all uncommon
to even notice pairs of them in python disassemblies.  Skip Montanaro suggested a
[peephole optimizer](https://legacy.python.org/workshops/1998-11/proceedings/papers/montanaro/montanaro.html) for
python that would identify and optimize common patterns but there is little evidence of it in the current codebase.
Recent efforts to improve python's performance (aka the [Shannon plan](https://github.com/markshannon/faster-cpython/blob/master/plan.md))
are focusing on different techniques like [inline caching](https://bernsteinbear.com/blog/inline-caching/) and
[adaptive instructions](https://peps.python.org/pep-0659/).  A substantial body of
[literature](https://users.ece.cmu.edu/~koopman/stack_compiler/stack_co.pdf) illustrates the challenges with generating
performant stack code.

I lack the attention span to tackle any significant fraction of these challenges.  This leaves me no choice but to seek
a different approach.  Koopman's article on optimized stack code generation as well as Brunthaler's on Quickening 
feature [Forth](https://en.wikipedia.org/wiki/Forth_(programming_language)) more or less prominently.  This piqued my
interest.  In the words of its creator, Forth is a [Problem-Oriented Language](http://www.forth.org/POL.pdf)
whose concatenative syntax fits certain [problem domains](https://www.forth.com/starting-forth/1-forth-stacks-dictionary/)
particularly well.  To me, Forth is a standardized notation for stack code much in the same sense that
[S-expressions](https://en.wikipedia.org/wiki/S-expression) are a standardized notation for
[ASTs](https://en.wikipedia.org/wiki/Abstract_syntax_tree).  That led to a realization: why bother
_generating_ performant stack code when users might do a better job _specifying_ performant stack code directly? In
other words, laziness leads me to the exact opposite objective than the FORTRAN I compiler team.  Empower developers
instead of trying to outsmart them!

Think you can do a better job hand-compiling a function than cpython's naïve bytecode compiler?  Great, express your approach
in Forth and it will get converted into bytecodes!  [`types.CodeType`](https://docs.python.org/3/library/types.html#types.CodeType)
can construct a new python [function](https://docs.python.org/3/glossary.html#term-function) from the bytecode stream.
Why not invert [dis](https://docs.python.org/3/library/dis.html)
instead?  For one, `dis` is rather verbose and its jump instructions also require exact offsets.  Look at the
[Collatz expression](https://en.wikipedia.org/wiki/Collatz_conjecture#Statement_of_the_problem) for example:

```nasm
>>> dis(lambda n: 3 * n + 1 if n & 1 else n // 2)
  1           0 LOAD_FAST                0 (n)
              2 LOAD_CONST               1 (1)
              4 BINARY_AND
              6 POP_JUMP_IF_FALSE       20
              8 LOAD_CONST               2 (3)
             10 LOAD_FAST                0 (n)
             12 BINARY_MULTIPLY
             14 LOAD_CONST               1 (1)
             16 BINARY_ADD
             18 RETURN_VALUE
        >>   20 LOAD_FAST                0 (n)
             22 LOAD_CONST               3 (2)
             24 BINARY_FLOOR_DIVIDE
             26 RETURN_VALUE
```

You need to know how many bytes are needed to express `3 * n + 1` so you can skip past them when `n` is even.  If you
come up with a clever transformation that shaves off a byte, you need to adjust the argument to `POP_JUMP_IF_FALSE`
accordingly.  In Forth, the same expression reads

```forth
: collatz ( n -- n ) dup 1 and if 3 * 1+ else 2/ then ;
```

Forth is not just more compact than python bytecode, it also requires no numerical offsets.  Of course, if you really
prefer typing all of that, feel free to use this [bytecode assembler](https://github.com/jburgy/blog/blob/master/fun/assemble.py).

Now that our objective is defined, what should the interface look like?  Compiling one function at a time is reasonable
for toy micro-optimizations.  That said, where should the Forth sit relative to the python function?  We could use
multi-line strings and parse Forth [Stack Comments](http://www.forth.org/forth_intro/comments.htm) to guess the python
signature.  That's rather hacky.  A nicer [kluge](http://catb.org/jargon/html/K/kluge.html) would be to save the Forth
implementation in the python's [docstring](https://docs.python.org/3/glossary.html#term-docstring).

In other words, we want to write

```python
def fib(n):
    """: fib { n }
n 1 0
begin rot dup
while 1 - -rot tuck +
repeat
drop nip ;
"""
    a = 1
    b = 0
    while n:
        n -= 1
        a, b = a + b, a
    return a
```

and apply a [higher-order function](https://en.wikipedia.org/wiki/Higher-order_function) or
[decorator](https://docs.python.org/3/glossary.html#term-decorator) to return a new python function whose
bytecode was derived from the Forth text.  This is precisely what [forth.py](https://github.com/jburgy/blog/blob/master/fun/forth.py)
achieves with a little [metaprogramming](https://docs.python.org/3/reference/datamodel.html#metaclasses) and
[self-modifying code](https://en.wikipedia.org/wiki/Self-modifying_code) thrown in.  The self-modifying code occurs
when methods of `class ForthCompiler` redefine its `emit_default` method based on the current Forth
[mode](https://www.complang.tuwien.ac.at/forth/gforth/Docs-html/Interpretation-and-Compilation-Semantics.html).

What is all for?  Simple timings show as much as 20% improvement on `fib(12)`.  The improvement is nowhere
near as good on `fast_fib(12)`.  The fact that a "smarter" $$\mathrm{log}_2 n$$ algorithm runs _slower_ is puzzling.
In conclusion, what did we learn?

1. Micro-optimizations are silly (but fun)
1. A [cost model](https://en.wikipedia.org/wiki/Analysis_of_algorithms#Cost_models) for python needs to be more subtle than simply counting instructions
