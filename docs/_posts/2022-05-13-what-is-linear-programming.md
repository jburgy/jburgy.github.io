---
layout: post
title:  "What is Linear Programming?"
date:   2023-05-12 07:31:23 -0500
---
## Or what do they mean by "solve for x"?

We all remember our introduction to basic algebra in grade or middle school.  Our teachers
would refer to them as "word problems" so we wouldn't panic at the ambiguity of not simply
applying a set of rehearsed instructions like we had done up to this point with long
additions.  The first questions only involved a single unknown (often labeled x) that we
had to "solve for".  For example, if a teacher brings 33 apples to class and gives each
student 3, how many students are in the class.  Then we moved on to more advanced problems
involving multiple unknowns.  We quickly learned that 2 unknowns require as many "facts"
to yield a unique solution.  And soon enough, without even realizing it, we started 
studying [linear algebra](https://en.wikipedia.org/wiki/Linear_algebra).

Did you ever wonder what happens when we break the rule that `N` unknowns require `N`
_independent_ equations for a unique solution?  There are only two cases to consider:

* more equations than unknowns ([overdetermined system](https://en.wikipedia.org/wiki/Overdetermined_system))
* fewer equations than unknowns ([underdetermined system](https://en.wikipedia.org/wiki/Underdetermined_system))

An overdetermined system might not have a single solution. It's common practive in that case
to pick the _least bad_ solution.  This involves measuring how much our hypothetical solution
"misses" each equation then searching for the solution that "misses" the least.  Specialists
call this approach _minimizing the L₂ norm_ and the associated procedure 
[Ordinary Least Squares](https://en.wikipedia.org/wiki/Ordinary_least_squares).  This technique
is very important when trying to extract trends from data.  However, OLS is not the focus of
this current blog.  We might return to it in a later post on
[statistical modeling](https://en.wikipedia.org/wiki/Statistical_model).

This post will focus on _underdetermined_ systems.  Underdetermined systems have either no
solution or infinitely many solutions.  These solutions form a [convex set](https://en.wikipedia.org/wiki/Convex_polytope)
in ℝⁿ.  That geometric interpretation is helpful.  Let us take a moment to understand how it comes about.
First, we remember that $$a x + b y + c z + d = 0$$ (where $$a$$, $$b$$, $$c$$, and $$d$$ represent known coefficients
whereas $$x$$, $$y$$, and $$z$$ represent unknowns) defines the two-dimensional plane in three dimensions
which is orthogonal to the vector $$(a, b, c)$$.  As a consequence, we can interpret the solution set
of an underdetermined system of equations as the intersection of these n-dimensional planes.  We struggle to
interpret geometric objects in more than 2 or 3 dimensions.  Fortunately, we can _project_ them to lower
dimensions.  Those projections are equivalent to dropping one of the dimensions (say $$z$$) and turning
the equality into an equality.  The same concept lets us go the other way (turning inequalities into
equalities) by introducing [slack variables](https://en.wikipedia.org/wiki/Slack_variable).

Recapping, having more unknowns than equations leads to infinitely many solutions.  We often choose
one _preferred_ solution out of that infinite _feasible_ set.  This can be achieved by defining an
[objective function](https://en.wikipedia.org/wiki/Loss_function) over the set of solutions.  In other
words, _optimization_ (which is what we call choosing the best objective value out of the _feasible_ set)
is complementary to _regression_ (where we find the _least bad_ approximate solution).  The next obstacle
is that linear optimization solvers expect the problem in
[matrix form](https://en.wikipedia.org/wiki/Linear_programming#Standard_form).  Take for example the
wheat and barley example in the previous link in 
[algebraic form](https://en.wikipedia.org/wiki/Algebraic_equation):

$$\begin{eqnarray}
\mathrm{maximize}\ 3x_1+4x_2 \\
\mathrm{subject\ to}\
\begin{array}{rcc}
x_1 + x_2 &\le& 10 \\
3x_1 + 6x_2 &\le& 48 \\
4x_1 + 2x_2 &\le& 32 \\
\end{array}
\end{eqnarray}$$

The corresponding matrix form reads

$$\begin{eqnarray}
\mathrm{maximize}\ (3\ 4)^T x \\
\mathrm{subject\ to}\
\left(
\begin{array}{cc}
1 & 1 \\
2 & 6 \\
4 & 2
\end{array}
\right) x \le
\left(
\begin{array}{cc}
10 \\
48 \\
32
\end{array}
\right)
\end{eqnarray}$$

Typography highlights the equivalence but how do we make computer "see" it?
First, we need objects that let us represent symbolic expressions.  It's not hard to
roll those by hand if we're only interested in this specific problem but that's hardly
the python way.  Much easier to install the standard python package for symbolic manipulations:
[sympy](https://docs.sympy.org).  Next, we are going to write a simple function that lets
us write our sample problem as

```python
from sympy.abc import x, y

maximum = maximize(
    4 * x + 3 * y,
    x + y <= 10,
    3 * x + 6 * y <= 48,
    4 * x + 2 * y <= 32,
)
```

Our function is very similar to
[sympy.linear_eq_to_matrix](https://docs.sympy.org/latest/modules/solvers/solveset.html#sympy.solvers.solveset.linear_eq_to_matrix)
except it also accepts an objective function and doesn't ask you to provide `symbols` but
infers them for you.

We start by collecting matrix coefficients:

```python
from operator import attrgetter, methodcaller

lhs = map(attrgetter("lhs"), constraints)  # maximize "*args"
coefficients = list(map(methodcaller("as_coefficients_dict"), lhs))
```

This representation as list of dictionaries remind us of a sparse matrix in
[Compressed Sparse Row](https://en.wikipedia.org/wiki/Sparse_matrix#Compressed_sparse_row_(CSR,_CRS_or_Yale_format))
format.  CSR is flat thanks to an extra array (`indptr`) which tells us where rows begin and end.  That's easy:

```python
from itertools import accumulate

indptr = np.fromiter(
    accumulate(map(len, coefficients), initial=0),
    dtype=int,
    count=len(constraints) + 1
)
```

The `data` is equally trivial, we just need to flatten the `.values()` of `coefficients`:

```python
from itertools import chain

data = np.fromiter(
    map(methodcaller("values"), coefficients), dtype=float, count=indptr[-1]
)
```

`indices` is a bit trickier.  It's precisely what
[`np.unique`](https://numpy.org/doc/stable/reference/generated/numpy.unique.html) means by
`return_inverse`.  Unfortunately, `np.unique` requires _comparable_ types because it invokes
[`np.argsort`](https://numpy.org/doc/stable/reference/generated/numpy.argsort.html) under the
hood.  Fortunately, [`pd.factorize`](https://pandas.pydata.org/docs/reference/api/pandas.factorize.html)
does precisely what we need (and only requires _hashable_ types):

```python
from scipy import sparse

indices, variables = pd.factorize(list(chain.from_iterable(coefficients)))
A = sparse.csr_array(
    (data, indices, indptr),
    shape=(len(constraints), len(variables)),
)
b = np.fromiter(
    map(methodcaller("evalf"), rhs), dtype=float, count=len(constraints)
)
c = np.vectorize(objective.coeff, otypes=[float])(variables)
```

`pd.factorize` also returned the unique variables which we can pass to
[`sympy.Expr.coeff`](https://docs.sympy.org/latest/modules/core.html#sympy.core.expr.Expr.coeff) to
define the `c` vector.

And there you have it, just learning the absolute minimum about `sympy`'s rich API lets us
convert a linear optimization problem to canonical form.
