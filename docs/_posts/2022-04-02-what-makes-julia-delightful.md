---
layout: post
title:  "What makes Julia delightful?"
date:   2022-04-02 15:04:31 -0500
categories: jekyll update
---
## Or how I Learned to Stop Worrying and Love the JIT

As [my previous post](/jekyll/update/2022/03/10/what-python-slow.html) shows, my early programming had to do with
numerical problems. So when I left graduate school to enter the industry, I read books and articles to pick up new
skills. [K&R](https://en.wikipedia.org/wiki/The_C_Programming_Language),
[TAOCP](https://en.wikipedia.org/wiki/The_Art_of_Computer_Programming), and Bentley's
[Programming Pearls](https://www.oreilly.com/library/view/programming-pearls-second/9780134498058/) made big
impressions. Then I heard about [an article](https://dl.acm.org/doi/10.1145/363347.363387) where Ken Thompson
explained how he implemented the original grep command as a JIT compiler on the IBM 7094 and I _had_ to know more. 

I found the PDF online (let me not digress into a rant about paywalls and academic journals) and slowly worked my
way through it. I even reached out to Ken when I couldn't figure out some assembly syntax that might be central
to the paper. Ever the gentleman, Ken took time out of his busy MiG-29 flying schedule to answer esoteric
questions from a nobody.  Specifically, I couldn't find any explanation for the `AXC **,7` syntax in the IBM 7094
instruction manual. Ken was so kind and patient and I'm truly sad that I have lost access to the email address
I was using at the time.  [Russ Cox](https://swtch.com/~rsc/) has a great
[IBM 7094 cheat sheet](https://swtch.com/~rsc/regexp/ibm7094.html) on his website which explains that "** is just
0 to the assembler, but by convention denotes a values that is manipulated at run-time (i.e., in self-modifying
code) by instruction such as PAC, PCA, and SCA."  This is part of a set of pages about
[regular expressions](https://swtch.com/~rsc/regexp/).

I was so intrigued by the fact that Ken's "implementation of this algorithm is a compiler that translates a
regular expression into IBM 7094 code. [...] In the compiled code, the lists mentioned in the algorithm are not
characters, but transfer instructions into the compiled code."  Pretty wild, uh.  Search algorithms like
[Boyer-Moore](https://en.wikipedia.org/wiki/Boyer%E2%80%93Moore_string-search_algorithm) typically keep track of
offsets into the pattern being searched for instead.  Translating the original IBM 7094 into x86 taught me
assembly conventions like instruction encoding, immediate operands, etc.  The result is a buggy little hack
which you can find on [Russ Cox's website](https://swtch.com/~rsc/regexp/regexp-x86.c.txt).  Russ did report that
"it runs for a very long time, making me think it is stuck in an infinite loop somewhere.  I haven't looked at it
closely."  To be honest, I haven't enough because I started my first Wall Street job around that time and hobby
programming took a back seat.

Fast forward almost twenty years.  I probably have the 10,000 hours Malcolm Gladwell conjectures are required to master
programming.  I wish I could say computers looks to me like the Matrix to Neo in that final fight scene but I'd
be lying.  I have, however, reached the point where I can read code and focus on intent rather than language specifics.
Jumping around between languages instead of becoming an expert in any one of them will do that.  I have picked up Julia
recently because of the (well deserved) hype around it and I'm a big fan.  Julia is known to be implemented as a
[JIT compiler](https://docs.julialang.org/en/v1/devdocs/eval/#dev-codegen) which, in theory, makes it a very suitable
environment to play around with Thomson's article once more.  Let us see how far we get!

The original article explains that the "compiler consists of three concurrently running stages.  The first stage is a
syntax sieve that allows only syntactically correct regular expressions to pass.  This stage also inserts the operator
"·" for juxtaposition of regular expressions.  The second stage converts the regular expression to reverse Polish form.
The third stage is the object code producer.  The first two stages are straightforward and not discussed."  That
description is entirely fair.  An immense body of literature describes lexical analysis and parsing.  Most of it feels
like a chore, "feeling that it's all a lot of oysters, but no pearls".  So how do we turn this mundane task into a learning
opportunity?  Well, by using it as an excuse to explore Julia's
[foreign function interface](https://docs.julialang.org/en/v1/manual/calling-c-and-fortran-code/) of course!

Julia's batteries already include [regular expressions](https://docs.julialang.org/en/v1/manual/strings/#man-regex-literals)
which are implemented by [ccall](https://docs.julialang.org/en/v1/base/c/#ccall)ing https://www.pcre.org.  Surely PCRE
first converts the regular expression into an intermediate representation.  Let us find and understand that instead of
rolling our own!  Julia gives us 2 ways to access the underlying PCRE `struct`: either via the `:regex` attribute of
[regex objects](https://docs.julialang.org/en/v1/manual/strings/#man-regex-literals) or by invoking `Base.PCRE.compile`
directly.  The latter approach guarantees we're calling [pcre2_compile](https://www.pcre.org/current/doc/html/pcre2_compile.html)
instead of [pcre2_jit_compile](https://www.pcre.org/current/doc/html/pcre2_jit_compile.html) so let's try that:

```julia
julia> Base.PCRE.compile("a(b|c)*d", 0)
Ptr{Nothing} @0x0000000002950e00
```

Great, we have a raw C pointer to a `pcre2_code` struct, now what?  We could read the
[PCRE source](https://github.com/PhilipHazel/pcre2) and guess field offsets.  That sounds tedious and not particularly fun.
Fortunately, I noticed two things when I started doing exactly that:

```c
/* Find start of compiled code */

code = (PCRE2_UCHAR *)((uint8_t *)re + sizeof(pcre2_real_code)) +
  re->name_entry_size * re->name_count;
```
in [pcre2_study.c](https://github.com/PhilipHazel/pcre2/blob/master/src/pcre2_study.c) and

```c
  case PCRE2_INFO_NAMETABLE:
  *((PCRE2_SPTR *)where) = (PCRE2_SPTR)((char *)re + sizeof(pcre2_real_code));
  break;
```
in [pcre2_pattern_info.c](https://github.com/PhilipHazel/pcre2/blob/master/src/pcre2_pattern_info.c).
[pcre2_pattern_info](https://www.pcre.org/current/doc/html/pcre2_pattern_info.html) is conveniently exposed as `Base.PCRE.info`
so we can "find start of compiled code" in Julia with

```julia
using Base.PCRE: INFO_NAME_COUNT, INFO_NAMENTRYSIZE, INFO_NAMETABLE, info

name_count = info(ptr, INFO_NAMECOUNT, UInt32)
name_entry_size = info(ptr, INFO_NAMEENTRYSIZE, UInt32)
info(ptr, INFO_NAMETABLE, Ptr{UInt8}) => (name_count * name_entry_size + 1)
```

At this point, we have the absolute address of the beggining of the PCRE bytecode stream.  We need a little more logic
to decode its contents.  Fortunately, [Philip Hazel](https://en.wikipedia.org/wiki/Philip_Hazel) included a handy text
document named [HACKING](https://github.com/PhilipHazel/pcre2/blob/master/HACKING).  This document begins with some
historical context then goes on to describe PCRE's internals.  We quickly learn that the "compiled form of a pattern is
a vector of unsigned code units (bytes in 8-bit mode, shorts in 16-bit mode, 32-bit words in 32-bit mode), containing
<mark>items of variable length</mark>.  The first code unit in an item contains an opcode, and the length of the item
is either implicit in the opcode or contained in the data that follows it." [emphasis added]

Cool, so PCRE compiled patterns are variable length, a little like [UTF-8](http://doc.cat-v.org/bell_labs/utf-8_history).
What's the most idiomatic way to decode it in Julia?  It took me a couple attempts to realize that Julia's
[multiple dispatch](https://en.wikipedia.org/wiki/Multiple_dispatch#Julia) and
["value types"](https://docs.julialang.org/en/v1/manual/types/#%22Value-types%22) lend themselves particularly well to
this problem:

```julia
using Base: Fix1

const OpChar = Val{0x1d}
const OpAlt = Val{0x78}
const OpKet = Val{0x79}
const OpBra = Val{0x86}

link(ptr::Ptr{UInt8}, i::Int) =
    UInt16(unsafe_load(ptr, i) << 8) | UInt16(unsafe_load(ptr, i + 1))

opcode(::OpChar, ptr::Ptr{UInt8}, i::Int) = Fix1(char!, Char(unsafe_load(ptr, i)))
opcode(::OpAlt, ptr::Ptr{UInt8}, i::Int) = Fix1(alt!, link(ptr, i) << 2)
opcode(::OpKet, ptr::Ptr{UInt8}, i::Int) = Fix1(ket!, link(ptr, i) << 2)
opcode(::OpBra, ptr::Ptr{UInt8}, i::Int) = Fix1(bra!, link(ptr, i) << 2)
```

Julia's [iteration interface](https://docs.julialang.org/en/v1/manual/interfaces/#man-interface-iteration) can also be
used to produce opcodes lazily.  The `OpCodes` iterator returns `Int => Fix1` _pairs_ similar to `Base.Dict` because
`link` arguments represent relative jumps.  You're probably wondering what makes the left shift by 2 necessary.  We
will get to it in a minute, I promise.  Let us first turn our attention to the the inner core of the matching
engine:

```julia
function match(opcodes::Dict{Int,Function}, string::String)
    curr = [2]
    next = empty(curr)
    for char ∈ string * "\0"
        for i ∈ curr
            opcodes[i>>2](curr, next, char, i) && return true
        end
        copy!(curr, next)
        empty!(next)
    end
    false
end
```

Code like this is sometimes called [call-threaded](https://en.wikipedia.org/wiki/Threaded_code#Subroutine_threading).
Following Thompson's article, two lists are maintained (named `curr` and `next` instead of `CLIST` and `NLIST`).
`curr` and `next` contain integers, not "TSX **,2 instructions" and, because of PCRE'2 internal representation,
these integers represent both the next instruction (think [program counter](https://en.wikipedia.org/wiki/Program_counter))
as well as information about the match so far packed into their two least significant bits.  The least significant bit
tells us whether this is a matching path.  The next bit tells us to treat the next instruction as an
[ε-move](https://en.wikipedia.org/wiki/Nondeterministic_finite_automaton#NFA_with_%CE%B5-moves).  PCRE2 compiles the
[Kleene star](https://en.wikipedia.org/wiki/Kleene_star) in `"(ab)*"` as

```julia
OrderedDict{Int64, Function} with 7 entries:
  0  => Fix1(bra!, 16 << 2)
  3  => brazero!
  4  => Fix1(cbra!, 9 << 2)  # jump to 13
  9  => Fix1(char!, 'a')
  11 => Fix1(char!, 'b')
  13 => Fix1(ketrmax!, 9 << 2)  # jump to 4
  16 => Fix1(ket!, 16 << 2)
```

The key difference between this and the simpler `"(ab)"` is the `brazero!` opcode at index `3`.  It indicates that the
following group can be leap-frogged entirely since the Kleene star matches 0 or more times.  All of the clever bits can
now be packed in the definitions of `alt!`, `char!`, `bra!`, and friends, see [here](https://github.com/jburgy/blog/blob/master/fun/regexp.jl).

To summarize, Julia's foreign function interface and multiple dispatch let us explore PCRE2's internal representation
and implement a bare bones call-threaded matching engine.  Julia's metaprogramming support should let us transform
that call-threaded code to direct-thread code, essentially unrolling the "thread" of opcodes to get another step closer
to Ken's original article.
