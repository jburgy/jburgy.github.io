---
layout: post
title:  "What, python, slow? No"
date:   2022-03-10 13:12:46 -0500
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
[1954](https://www.ibm.com/history/fortran).  Lisp 1.5 already supported garbage collection
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
The full program can be found [here](https://github.com/jburgy/blog/blob/main/fun/nbody.py).

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

### See it for yourself

I feel pretty strongly that [pyodide](https://pyodide.org/en/stable/) fits
[Arthur C. Clarke](https://en.wikipedia.org/wiki/Arthur_C._Clarke)'s 
[third law](https://en.wikipedia.org/wiki/Clarke%27s_three_laws): it lets you run
python in the browser via the techno-magic of [WebAssembly](https://webassembly.org/).
So while you were reading this post, your browser downloaded a Wasm port of
[cpython](https://en.wikipedia.org/wiki/CPython), pip installed 
[matplotlib](https://matplotlib.org/), [scipy](https://scipy.org/)
(as well as the [transitive closure](https://en.wikipedia.org/wiki/Transitive_closure) of
their dependencies), generated the trajectories of 
[Jovian planets](https://en.wikipedia.org/wiki/Giant_planet), and rendered them
to the HTML animation you can see below.  All of this _inside your browser_!

<!-- PyScript CSS -->
<link rel="stylesheet" href="https://pyscript.net/releases/2023.12.1/core.css">

<!-- This script tag bootstraps PyScript -->
<script type="module" src="https://pyscript.net/releases/2023.12.1/core.js"></script>

<body>
    <script type="py" config='{"packages": ["matplotlib", "scipy"]}'>
from pyscript import document
from matplotlib import animation, pyplot as plt
from matplotlib_pyodide.browser_backend import TimerWasm  # type: ignore
from numpy import array, divide, empty, greater, multiply, pi, r_, sqrt, sum, take
from scipy.linalg.blas import daxpy, dspr2, zhpmv, zhpr


class Timer(TimerWasm):
    def __init__(self, interval=None):
        self._timer = None
        super().__init__(interval=interval)


# fmt: off
x = array([
    [0.0, 0.0, 0.0],
    [4.84143144246472090e+00, -1.16032004402742839e+00, -1.03622044471123109e-01],
    [8.34336671824457987e+00, 4.12479856412430479e+00, -4.03523417114321381e-01],
    [1.28943695621391310e+01, -1.51111514016986312e+01, -2.23307578892655734e-01],
    [1.53796971148509165e+01, -2.59193146099879641e+01, 1.79258772950371181e-01],
]).T
v = array([
    [0.0, 0.0, 0.0],
    [1.66007664274403694e-03, 7.69901118419740425e-03, -6.90460016972063023e-05],
    [-2.76742510726862411e-03, 4.99852801234917238e-03, 2.30417297573763929e-05],
    [2.96460137564761618e-03, 2.37847173959480950e-03, -2.96589568540237556e-05],
    [2.68067772490389322e-03, 1.62824170038242295e-03, -9.51592254519715870e-05],
]).T * 365.24
m = array([
    1.0,
    9.54791938424326609e-04,
    2.85885980666130812e-04,
    4.36624404335156298e-05,
    5.15138902046611451e-05,
]) * 4 * pi**2
# fmt: on

# v[:, 0] = -sum(m * v, axis=1) / m[0]
a = empty(x.shape, dtype=complex)

jm = m * -1j
n = x.shape[1]
# see https://stackoverflow.com/a/52564537/8479938
# only need upper triangle plus diagonal hence ½ n x (n + 1)
ap = empty((3, n * (n + 1) // 2), dtype=complex)
xxT = empty(ap.shape[1], dtype=float)
where = empty(ap.shape, dtype=bool)
d = empty(ap.shape[1], dtype=float)
trid = r_[0, 2 : n + 1].cumsum()  # noqa: E203 triangular diagonal
x2 = empty(n, dtype=float)
ones = empty(n, dtype=float)
ones.fill(1.0)

dt = 0.01

xs = empty((20_000, *x.shape))

for xt in xs:
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

    xt[:] = x


def update_lines(num: int, xs: array, lines: list[plt.Line2D]) -> list[plt.Line2D]:
    for i, line in enumerate(lines):
        line.set_data_3d(xs[i, :, : num * 100 : 100])
    return lines


# Attaching 3D axis to the figure
fig = plt.figure()
ax = fig.add_subplot(projection="3d")

# Create lines initially without data
lines = [ax.plot([], [], [])[0] for _ in m]

# Setting the Axes properties
ax.set(xlim3d=(xs[:, 0, :].min(), xs[:, 0, :].max()), xlabel="X")
ax.set(ylim3d=(xs[:, 1, :].min(), xs[:, 1, :].max()), ylabel="Y")
ax.set(zlim3d=(xs[:, 2, :].min(), xs[:, 2, :].max()), zlabel="Z")

# Creating the Animation object
ani = animation.FuncAnimation(
    fig=fig,
    func=update_lines,
    frames=len(xs) // 100,
    fargs=(xs.T, lines),
    interval=30,
    event_source=Timer(interval=30),
)

document.getElementById("animation").replaceChildren(
    document.createRange().createContextualFragment(ani.to_jshtml())
)
    </script>
    <div id="animation"></div>
</body>