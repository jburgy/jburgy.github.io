---
layout: post
title:  "What, python, slow? No"
date:   2022-03-10 13:12:46 -0500
categories: jekyll update
---
## Or Numerics like it's 1959
## Or Programming High and Low

Python is famously dynamic and flexible.  This flexibility comes at a cost, often on runtime performance.  That cost
is often more than offset by the boost in developer productivity.  But what if python developers can have their cake
and eat it too?  Flexibility is not mandatory.  You can _opt out_ of those features that have a large performance
impact if your problem warrants it.  

I am going to show how old programming techniques let you speed up numerical code without rewriting tight loops in C++
or rust thereby avoiding the two language problem. Some of these techniques form the basis of my mental model for rust
(disclaimer: I'm more crustacean than rustacean, by which I mean curious bystander with some, mostly flawed,
understanding of how CPUs work)

One of the best features of python is that it has no `new` keyword like C++. Python manages your program's memory so
you don't have to. [Alan Perlis](https://en.wikipedia.org/wiki/Alan_Perlis) captured the difference between automatic
and manual memory management in his famous "A LISP programmer knows the value of everything, but the cost of nothing"
[epigram](https://en.wikipedia.org/wiki/Epigrams_on_Programming).  Now don't get me wrong, I absolutely _love_ not 
having to manage memory myself.  That said, surely must be an explanation why C and C++ insist on forcing it on the
unsuspecting developer.  The best explanation is that inefficient memory access can annihilate your code performance.
An enormous effort has gone in the design of [memory management in cpython](https://docs.python.org/3/c-api/memory.html).
Similarly, memory allocations are prominent in the
[julia profiler](https://docs.julialang.org/en/v1/manual/profile/#Memory-allocation-analysis).  Quoting from that link,
"One of the most common techniques to improve performance is to reduce memory allocation."

### Contrast with FORTRAN
Early versions of FORTRAN had a big drawback: they did not allow for dynamic memory allocation, forcing re-compilation
when array sizes changed.  Work started on the first FORTRAN compiler in
[1954](https://www.ibm.com/ibm/history/ibm100/us/en/icons/fortran/).  Lisp 1.5 already supported garbage collection
around that time, although the first lisp compiler did not appear until 1962.  According to
[Henry Spencer](https://compilers.iecc.com/comparch/article/97-10-017), "Backus and his team sweated quite hard on
optimization in the FORTRAN I compiler [...], and so their objective was to generate code that was *better* than the
average hand-coded assembler. And astonishingly enough, in one of the first real compilers, they often succeeded." Many
agree that FORTRAN left memory management up to developers because of performance.

That made programming a rather tedious endeavor.  Developers would carefully think through all the bits of memory that
their program would need.  Often they would allocate a bunch of static arrays in the global scope (\<gasp\>).  The
meaning of array elements would change in different parts of the program.  This is clear when you see the number of
linear algebra subroutines which expect `WORK` parameters (see 
[dgels.f](https://www.netlib.org/lapack/lapack-3.1.1/html/dgels.f.html) for example).

### Best of both worlds?

Does it have to be an either/or situation or can python programmers have their cake and eat it too?  How can python's
awesome versatility let us leverage these carefully coded numerical routines?  The answer lies in 
[PEP 3118](https://peps.python.org/pep-3118/)'s buffer protocol.  Quoting from 
[Jake VanderPlas' excellent introduction](https://jakevdp.github.io/blog/2014/05/05/introduction-to-the-python-buffer-protocol/),
the "Python buffer protocol [...] is a framework in which Python objects can expose raw byte arrays to other Python
objects."  And when those "other Python objects" are thin wrappers around excellent low-level numerical libraries
like [BLAS](https://docs.scipy.org/doc/scipy/reference/linalg.blas.html) or
[LAPACK](https://docs.scipy.org/doc/scipy/reference/linalg.blas.html), we can _embrace_ the
[Two-Language Problem](https://juliadatascience.io/julia_accomplish#sec:two_language) instead of avoid it.
And all of that without writing a single line in a language other than python.  To be fair, the resulting code will
**not** be particularly [idiomatic](https://peps.python.org/pep-0020/).  But it will still be python and offer the
readability and portability we have come to expect.

### What does it look like?

Let's explore this idea through an example. A word of warning: this example is not for the faint of heart as it
uses some rather esoteric tricks.  And of course, no optimization story would be complete without the usual
[reminder](https://wiki.c2.com/?PrematureOptimization) that "premature optimization is the root of all evil."
We are going to consider the [n-body benchmark](https://pybenchmarks.org/u64q/performance.php?test=nbody).  The python
benchmark links to a [Wikipedia artile](https://en.wikipedia.org/wiki/N-body_problem) which frames the problem
mathematically.  I highly recommend you pick up Volume 1 of the
[Course of Theoretical Physics](https://en.wikipedia.org/wiki/Course_of_Theoretical_Physics) if you want to really
understand the math.  And if you enjoy reading how giant of physics writing about celestial mostion, you might also
like [Feynman's Lost Lecture](https://en.wikipedia.org/wiki/Feynman%27s_Lost_Lecture).  The premise of that lecture is
wonderfully contrived: Isaac Newton could not use calculus to convince the Royal Society that inverse square force
leads to elliptical orbits because they would not have followed.  So Newton used geometric arguments instead in his
[Principia](https://en.wikipedia.org/wiki/Philosophi%C3%A6_Naturalis_Principia_Mathematica).  Feynman thought Newton's
arguments were too complicated and used his pedagogical prowess to come up with a simpler one _only_ relying on
results available at the time.

The n-body benchmark is a straightforward [finite-difference](https://en.wikipedia.org/wiki/Finite_difference_method)
integration of Newton's equations of motion:

$$\mathbf{\ddot{q}}_i = G \sum_{j \neq i} \frac{\mathbf{q}_j - \mathbf{q}_i}{\left\lVert \mathbf{q}_j - \mathbf{q}_i \right\rVert^3} m_j$$

The first thing we notice is that this expression is antisymmetric.  The force exerted by object $$i$$ on object $$j$$
is equal in magnitude but with opposite sign as the force exerted by $$j$$ on $$i$$.  This is reminiscent of the
imaginary part of a [Hermitian matrix](https://en.wikipedia.org/wiki/Hermitian_matrix) which are so common in linear
algebra that library designers came up with a [packed storage](https://www.netlib.org/lapack/lug/node123.html)
specifically for them.  We are going to use 3 BLAS subroutines that operate on matrices in packed form:

| Hermitian rank 1 operation | [zhpr](https://docs.scipy.org/doc/scipy/reference/generated/scipy.linalg.blas.zhpr.html) | $$A := \alpha x x^H + A$$ |
| Hermitian matrix-vector multiplication | [zhpmv](https://docs.scipy.org/doc/scipy/reference/generated/scipy.linalg.blas.zhpmv.html) | $$ y := \alpha A x + \beta y$$ |
| Symmetric rank 2 operation | [dspr2](https://docs.scipy.org/doc/scipy/reference/generated/scipy.linalg.blas.dspr2.html) | $$ A := \alpha\left(x y^T + y x^T\right) $$ |

Those names are a bit cryptic because of "the very tight limits of standard Fortran 77 6-character names".  They make
sense when you familiarize yourself with the reasonable [naming scheme](https://www.netlib.org/lapack/lug/node24.html).


We need one more trick before we can leverage these routines to compute $$\mathbf{\ddot{q}}_i$$.
Let $$x$$ and $$y$$ be real numbers and $$i^2=-1$$:

$$(x-i)\overline{(y-i)} = xy + 1 + i(x-y)$$

This trick suggests we should subtract $$i$$ from $$\mathbf{q}_i$$ before invoking `zhpr` with $$\alpha=-2$$.  This
operation initializes $$A_{ij}$$ to $$-2\left[q_iq_j + 1 + i\left(q_i - q_j\right)\right]$$.  The real part of $$A$$
contains information to compute $$\left\lVert \mathbf{q}_j - \mathbf{q}_i \right\rVert^2$$ when we remember that

$$-2 xy = (x - y)^2 - x^2 - y^2$$

Solving this equation for $$(x-y)^2$$ is precisely what `dspr2` does when $$\alpha=-½$$,
$$x_i=\mathbf{q}_i\mathbf{q}^T_i$$, and $$y_i=1$$.  Finally, `zhpmv` performs the sum over $$j$$, seen as the scaled
displacement matrix multiplying the mass vector.  Pretty clever, uh.  All credit goes to 
[Paul Panzer](https://stackoverflow.com/users/7207392/paul-panzer) for this amazing
[stackoverflow answer](https://stackoverflow.com/a/52564537/8479938).  Putting it all together, the inner loop to
calculate acceleration $$\mathbf{a}$$ from positions $$q$$ (with no significant memory allocations) looks like

```python
a.real = x
a.imag.fill(-1.0)
ap.fill(0.0)
for i in range(3):  # A += α z z*
    zhpr(n, alpha=-2.0, x=a[i], ap=ap[i], overwrite_ap=True)

sum(ap.real, axis=0, out=xxT)
xxT += 6
take(xxT, trid, out=x2)
# A += α (x yᵀ + y xᵀ)
dspr2(n, alpha=-0.5, x=x2, y=ones, ap=xxT, overwrite_ap=True)

sqrt(xxT, out=d)
multiply(xxT, d, out=xxT)
greater(xxT, 0.0, out=where)
divide(ap.imag, xxT, where=where, out=ap.imag)

for i in range(3):  # y = α A x + β y
    zhpmv(n, alpha=0.5, ap=ap[i], x=jm, beta=0.0, y=a[i], overwrite_y=True)

daxpy(a=dt, x=a.real, y=v)  # v += a dt
daxpy(a=dt, x=v, y=x)  # x += v dt
```
The full program can be found [here](https://github.com/jburgy/blog/blob/master/fun/nbody.py).

### Postscript

I came across this [excellent FORTRAN vs python anecdote](https://cerfacs.fr/coop/fortran-vs-python) a couple of weeks
after originally publishing this post.  The authors make an important, albeit counterintuitive, point about the
strength of high-level languages like python compared to low-level ones like FORTRAN.  "By definition, a higher level
language will allow more explorations."  Few programmers will completely redesign hundreds or thousands of lines of
working FORTRAN or C++.  Addressing compiler errors and warnings took [long enough](https://3d.xkcd.com/303/) that
they're forced to move on to the next deadline.  But a few dozen lines of python is a different story.  And the
[REPL](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop) even lets you explore different algorithms
_interactively_.

In conclusion, we should be more explicit when we say that a particular programming language is slow.  Slow to do
what?  Let us not conflate iterating in tight inner loops with iterating in the problem domain.

### Do it for yourself
Click <a href="javascript:void(0)" id="fetch">here</a> to copy entire script to clipboard, paste it in the
dialog below then hit <kbd>Shift</kbd> + <kbd>Enter</kbd> to run!

<style>
kbd {
    background-color: #eee;
    border-radius: 3px;
    border: 1px solid #b4b4b4;
    box-shadow: 0 1px 1px rgba(0, 0, 0, .2), 0 2px 0 0 rgba(255, 255, 255, .7) inset;
    color: #333;
    display: inline-block;
    font-size: .85em;
    font-weight: 700;
    line-height: 1;
    padding: 2px 4px;
    white-space: nowrap;
}

.hero-right {
    display: flex;
    flex-direction: column;
    /* Black, with 10% opacity */
    box-shadow: 0px 8px 15px rgba(0, 0, 0, 0.1);
    background: rgb(238, 238, 238);
    padding: 15px;
}

.numpy-shell-canvas {
    min-height: 455px
}

.numpy-shell-container {
    height: 100%;
    display: flex;
    position: relative;
    flex-direction: row;
    justify-content: space-evenly;
    align-items: stretch;
    max-width: 1500px;
    margin: auto
}

.numpy-shell {
    border: 0;
    flex: 2;
    min-height: 500px;
    padding: 0 15px
}

.CodeMirror {
    max-height: 124px;
}

.CodeMirror-lines {
    min-height: 30px!important;
}

.CodeMirror pre {
    color: #fff!important;
}

.CodeMirror-cursor {
    color: #fff!important;
    border-left: 1px solid #fff!important
}

@media only screen and (max-width: 800px) {
    .numpy-shell-container {
        flex-direction: column;
        justify-content: space-around
    }
}
</style>

<script>
window.addEventListener("DOMContentLoaded", () => 
    document.getElementById("fetch").addEventListener("click", () =>
        fetch("https://raw.githubusercontent.com/jburgy/blog/master/fun/nbody.py")
        .then(response => response.text())
        .then(text => navigator.clipboard.writeText(text))
        .catch(error => console.error(error))
    )
)
</script>

<div class="hero-right">
    <div class="numpy-shell-canvas">
        <div class="numpy-shell-container">
            <iframe
                class="numpy-shell"
                src="https://jupyterlite.github.io/demo/repl/?toolbar=1&kernel=python"
            >
        </div>
    </div>
</div>