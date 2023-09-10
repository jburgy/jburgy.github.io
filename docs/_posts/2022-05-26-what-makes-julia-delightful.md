---
layout: post
title:  "What makes Julia delightful, cont'd?"
date:   2022-05-26 20:37:34 -0500
---
## Or how I Finally Dipped my Toes into Macros

I explored the [unreasonable effectiveness](https://www.juliaopt.org/meetings/santiago2019/slides/stefan_karpinski.pdf)
of Julia's code dispatch in my [previous article]({{page.previous.url}}) by using it to interpret PCRE's internal
representation.  Dispatching on ["value types"](https://docs.julialang.org/en/v1/manual/types/#%22Value-types%22)
is a great fit for binary encoding and the whole affair was entirely pleasant.

I also started using multiple dispatch to match regular expressions against text but realized that 
[Base.Fix2](https://docs.julialang.org/en/v1/base/base/#Base.Fix2) was just as readable.  With that out of the way, I
could finally focus on my real target: JIT compilation!  For some reason, my first thought was to interact
with [LLVM](https://docs.julialang.org/en/v1/devdocs/llvm/) directly.  The `llvmcall` examples in `test/llvmcall.jl`
looked frankly daunting and I quickly hoped for an easier way.  The chapter on
[metaprogramming](https://docs.julialang.org/en/v1/manual/metaprogramming/#Metaprogramming) provided an answer.
I am trying to generate a specialized matching function from the dictionary of opcodes which represent the
regular expression.

Once I got my head around [quoting](https://docs.julialang.org/en/v1/manual/metaprogramming/#Quoting) and
[interpolation](https://docs.julialang.org/en/v1/manual/metaprogramming/#man-expression-interpolation), the function
which generates the specialized matcher is only thrice the length of the generic matcher.  And the most satisfyingly
impressive part of it is that section spotted in the output of 
[@code_llvm](https://docs.julialang.org/en/v1/stdlib/InteractiveUtils/#InteractiveUtils.@code_llvm):

```llvm
;  @ /home/jburgy/blog/fun/regexp.jl:175 within `#42'
; ┌ @ int.jl:462 within `>>' @ int.jl:455
   %47 = ashr i64 %value_phi7, 2
; └
;  @ /home/jburgy/blog/fun/regexp.jl:161 within `#42'
  switch i64 %47, label %L405 [
    i64 0, label %L101
    i64 5, label %L150
    i64 6, label %L174
    i64 13, label %L223
    i64 11, label %L230
    i64 16, label %L258
    i64 18, label %L286
    i64 21, label %L341
    i64 3, label %L369
    i64 23, label %L397
  ]
```

Even though the generated code is a concatenation of conditional expressions, LLVM is "smart enough to lower the branch
into a switch" as explained in [this discourse answer](https://discourse.julialang.org/t/computed-goto-or-labels-as-values-in-julia/5013/2).
Using [@code_native](https://docs.julialang.org/en/v1/stdlib/InteractiveUtils/#InteractiveUtils.code_native) to dig
even deeper, LLVM compiles to

```nasm
; │ @ regexp.jl:175 within `#42'
; │┌ @ int.jl:462 within `>>' @ int.jl:455
        movq    %r13, %rax
        sarq    $2, %rax
; │└
; │ @ regexp.jl:161 within `#42'
        cmpq    $23, %rax
        ja      L1360
; │ @ regexp.jl within `#42'
        movabsq $.rodata, %rcx
        jmpq    *(%rcx,%rax,8)
```

Does this last line ring a bell?  Well, if it isn't the familiar [NEXT macro](https://github.com/nornagon/jonesforth/blob/master/jonesforth.S#L305-L471)
of [threaded code](https://en.wikipedia.org/wiki/Threaded_code) frame!  I'll be darned!

[52b6b1d](https://github.com/jburgy/blog/commit/52b6b1d0225f0e7756558c196a8e1b718aa15091) is the commit that made this
all work.  The first half of it might not even be necessary but I simply couldn't figure out how to recover the
[Expr](https://docs.julialang.org/en/v1/base/base/#Core.Expr) from a 
[Function](https://docs.julialang.org/en/v1/base/base/#Core.Function) so I grabbed those expressions _before_ turning
them into functions.  Easy enough but I'd welcome a solution which didn't require generating those functions as well.

You've got to admit, that's pretty cute, isn't it.

**9/10/23 Update**: Pretty cute but not cute enough.  The way
[52b6b1d](https://github.com/jburgy/blog/commit/52b6b1d0225f0e7756558c196a8e1b718aa15091)
dissected the matchers into bodies and argument lists bothered me because it hurts readability.
Granted, this code was never particularly readable to begin with.  All the more reason to mitigate noise.
This bothered me so much that I eventually asked a
[question](https://discourse.julialang.org/t/how-would-macros-make-this-code-clearer/103702)
on [https://discourse.julialang.org/](https://discourse.julialang.org/).  As is often the case, asking
the question forced me to pinpoint what really bugged me so I could address it with
[0e00457](https://github.com/jburgy/blog/commit/0e00457b606d9d6ab65b8c3ea8c202f2479832b2).  As a result,
[0e00457/fun/regexp.jl](https://github.com/jburgy/blog/blob/0e00457b606d9d6ab65b8c3ea8c202f2479832b2/fun/regexp.jl)
looks much more like
[e3e5bc7/fun/regexp.jl](https://github.com/jburgy/blog/blob/e3e5bc76bed152fe4c8641c2204bb87af53af4b5/fun/regexp.jl)
with the extra
```julia
matchers = quote
# all function definitions
end

exprs = Dict{Symbol,Tuple{Expr,Vararg{Expr}}}(
    expr.args[1].args[1] => (expr.args[2], expr.args[1].args[2:end-4]...)
    for expr in matchers.args if is_expr(expr, :function)
)

eval(matchers)
```
In other words, define the matchers inside a _single_ 
[`quote`](https://docs.julialang.org/en/v1/base/base/#quote) instead of dissecting them.
This makes it possible
to [`eval`](https://docs.julialang.org/en/v1/base/base/#Core.eval) them _and_
access their names, parameters, and bodies.