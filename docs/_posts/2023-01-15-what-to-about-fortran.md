---
layout: post
title:  "What Ever Happened to Fortran?"
date:   2023-01-15 13:35:46 -0500
---

## Or A New Coat of Paint on your Old Shed

For decades, talented scientists implemented amazing numerical algorithms in [Fortran](https://en.wikipedia.org/wiki/Fortran),
so much so that it became known as the "lingua franca" of the computer industry.  As a
result, a large body of valuable software is slowly fading into oblivion.  How can we
make this software accessible to modern developers?

Most dynamic programming languages support a [Foreign function interface](https://en.wikipedia.org/wiki/Foreign_function_interface)
that allows to programs to call routines written in a different (hence foreign) language.
[ctypes](https://docs.python.org/3/library/ctypes.html), which is part of
[the python standard library](https://docs.python.org/3/library/index.html),
is only one of many similar solutions.  Other approaches, like [SWIG](https://www.swig.org/) and
[pybind11](https://pybind11.readthedocs.io/en/stable/) rely on additional declarations to generate python
bindings.  So far, these tools generate python wrappers for C and C++ functions.  Fortran
functions and subroutines can be called from C so any of these should be sufficient in theory. In practice,
this requires a reasonably deep understanding of the python [ABI](https://en.wikipedia.org/wiki/Application_binary_interface)
to work correctly.

This is precisely the niche that [F2PY](https://numpy.org/doc/stable/f2py/) fills.  Quoting
from its documentation, "The purpose of the `F2PY` -*Fortran to Python interface generator*-
utility is to provide a connection between Python and Fortran." Large chunks of
[`numpy`](https://numpy.org/) and [`scipy`](https://scipy.org/) are made possible by `f2py`.
Now we need an interesting piece of Fortran to experiment with `F2PY`.

I have chosen a frightfully clever implementation of the [Cooley-Tukey FFT algorithm](https://en.wikipedia.org/wiki/Cooley%E2%80%93Tukey_FFT_algorithm)
by [Dr Norman Brenner](https://home.gwu.edu/~nbrenner/), now at The George Washington University.
Dr Brenner's is a multi-radix, arbitrary dimension, real or complex fast fourier transform.
It is described in detail in a [technical note](https://apps.dtic.mil/sti/pdfs/AD0657019.pdf)
published in 1967 "with the support of the U.S. Air Force under Contract AF 19(628)-5167".
A number of digital versions can be found online, often embedded in larger single file Fortran
projects, as was typical at the time.

According to [this reference page](https://www.math-cs.gordon.edu/courses/cs323/FORTRAN/fortran.html),
FORTRAN IV arrays already "may have 1 to 7 subscripts".  However, because indices are explicit in the
syntax, *arbitrary numbers of dimensions* require additional effort.  The technical note explains that,
"As usual, the first subscript varies the fastest in storage order".  In other words, if `A` is a 
three-dimension array with dimensions `L × M × N`, element `A(I, J, K)` is stored at offset
`I - 1 + L * ((J - 1) + M * (K - 1))`, see [here](https://en.wikipedia.org/wiki/Row-_and_column-major_order#Address_calculation_in_general).

Another wonderful quirk of older (i.e. unstructured) Fortran dialects is the *arithmetic*
`IF`.  *Arithmetic* `IF` does not expect a boolean expression but a *general* expression and
is followed by 3 comma-separated integers.  Control flow is transferred to one of these
integer labels based on the *sign* of the expression (first label when the expression is negative,
second label when it is zero, or third label when it is positive).  This allows for
a really [compact binary search](https://rosettacode.org/wiki/Binary_search#Iterative,_exclusive_bounds,_three-way_test.).

As a final note, I got everything working and felt pretty good about myself until I read about
the [status of `numpy.distutils`](https://numpy.org/doc/stable/reference/distutils_status_migration.html).
I consider simply ignoring it.  After all, this is not a project I maintain or anything.  But I realize
how painful it would be to get back to it in several months once my github actions start failing
miserably.  So I bit the bullet, crossed the [pons asinorum](https://en.wikipedia.org/wiki/Pons_asinorum),
and learned [meson](https://mesonbuild.com/) because that's what [SciPy](https://scipy.org/) uses.
To be frank, I take exception about the nasty line about `make` in the
[f2py documentation](https://numpy.org/doc/stable/f2py/buildtools/index.html).  Call me old-fashioned
but I find it hard to place a high value on the investment it took me to pick up `meson`. 