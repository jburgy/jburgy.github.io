---
layout: post
title:  "What is satisfiability?"
date:   2024-12-19 12:32:12 -0500
---
## Or How Much is ever Enough?

This year, I am having fun taking part in my first ever [Advent of Code](https://adventofcode.com/)!
Day 17 threw me for a loop and forced me to learn a new technique so that deserves a quick write-up.
As with other days, it's a two part challenge which starts easy.  The first challenge involves a
bytecode interpreter and you know how much I like those!  My input is equivalent to the following
python code:

```python
from collections.abc import Iterable

def device(a: int) -> Iterable[int]:
    while a:
        b = a & 7    # bst A
        b ^= 6       # bxl B
        c = a >> b   # cdv B
        b ^= c       # bxc
        b ^= 4       # bxl 4
        yield b & 7  # out B
        a >>= 3      # adv 3
        continue     # jnz 0

print(*device(66171486), sep=",")
```

So far so good.  Part 2 gets hairy and involves searching for the smallest argument `a` that
makes the device into a [quine](https://en.wikipedia.org/wiki/Quine_(computing)).  Simplifiying
the program as shown below highlights the fact that `device` yields one value per octal digit
of `a`.  So we're looking for an `a` with 16 octal digits.  There are $$2^{48}$$ of those!
This reminds us of the [wheat and chessboard problem](https://en.wikipedia.org/wiki/Wheat_and_chessboard_problem)
and we quickly realize that a 
[brute-force search](https://en.wikipedia.org/wiki/Brute-force_search) will run into
[heat death of the universe](https://en.wikipedia.org/wiki/Heat_death_of_the_universe) issues
(although not quite a quickly as I would like to admit).

```python
def device(b: int) -> Iterable[int]:
    while a := b:
        b, c = divmod(a, 8)
        yield (a >> (c ^ 6) ^ c ^ 2) & 7
```

I could vaguely remember reading something about [SAT solvers](https://en.wikipedia.org/wiki/SAT_solver)
and [Bit Twiddling Hacks](https://graphics.stanford.edu/~seander/bithacks.html).  The combine search
took me to [this page](https://ericpony.github.io/z3py-tutorial/guide-examples.htm) and the following
Z3-based solution:

```python
from z3 import BitVec, solve

a = BitVec("A", 51)
constraints = []
for out in [2, 4, 1, 6, 7, 5, 4, 6, 1, 4, 5, 5, 0, 3, 3, 0]:
    b = a & 7
    b ^= 6
    c = a >> b
    b ^= c
    b ^= 4
    constraints.append(b & 7 == out)
    a >>= 3
constraints.append(a == 0)
solve(*constraints)
```

Z3 solves this problem so fast, its runtime is barely noticeable. That's impressive on
several levels:
* `pip install z3-solver` just worked™
* the API is n00b-friendly
* solution is accepted by AoC

In my defense, I had worked with
[algebraic modeling languages](https://en.wikipedia.org/wiki/Algebraic_modeling_language)
before but [Z3](https://en.wikipedia.org/wiki/Z3_Theorem_Prover) remains an impressive bit of
tech.

Still, I couldn't help but feel that I [brought a gun to a knife fight](https://xkcd.com/1890/).
(Don't get me wrong, I absolutely took the AoC credit but I didn't love the 
[black box](https://en.wikipedia.org/wiki/Black_box) solution).  So I stared at the short
implementation for a while longer and realize an alternative solution:

```python
a = {0}
for out in reversed([2, 4, 1, 6, 7, 5, 4, 6, 1, 4, 5, 5, 0, 3, 3, 0]):
    a = {
        d for b in a for c in range(8)
        if ((d := (b << 3) | c) >> (c ^ 6) ^ c ^ 2) & 7 == out
    }
min(a)
```

Ultimately, this amounts of [backward induction](https://en.wikipedia.org/wiki/Backward_induction)
which is likely one of the many strategies that `Z3` implements.  Unlike the brute-force approach,
this implementation [prunes](https://en.wikipedia.org/wiki/Prune_and_search) aggressively which
keeps its complexity much manageable.
