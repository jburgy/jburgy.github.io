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

An overdetermined system does not have a solution. It's common practive in that case
to pick the _least bad_ approximation.  This involves measuring how much our hypothetical solution
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
the equality into an inequality.  The same concept lets us go the other way (turning inequalities into
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
3 & 6 \\
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

The `data` vector is equally trivial, we just need to flatten the `.values()` of `coefficients`:

```python
from itertools import chain

data = np.fromiter(
    chain.from_iterable(map(methodcaller("values"), coefficients)),
    dtype=float,
    count=len(indices),
)
```

(Please forgive me if you're finding [operator](https://docs.python.org/3/library/operator.html)
and [itertools](https://docs.python.org/3/library/itertools.html) hard to grok.
[List comprehensions](https://docs.python.org/3/tutorial/datastructures.html#list-comprehensions)
would have been equally suitable to express this logic)

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

## Update: 3/20/2026

I went looking online for an early FORTRAN implementation of the simplex method and came
across the [NSWC Library of Mathematics Subroutines](https://apps.dtic.mil/sti/tr/pdf/ADA261511.pdf)
(where NSWC stands for Naval Surface Warface Center).  It appeared several years _after_
Dantzig's original discovery yet still has that musty old code smell.  I slapped some python
bindings on it using [f2py](https://numpy.org/doc/stable/f2py/f2py.getting-started.html#the-smart-way)
then looked for a classical problem to test it.  I came across an articled called
[Sudoku, Linear Optimization, and the Ten Cent Diet](https://research.google/blog/sudoku-linear-optimization-and-the-ten-cent-diet/) with a great line:

> The [Simplex algorithm](https://en.wikipedia.org/wiki/Simplex_algorithm) for linear optimization
> was two years away from being invented, so Stigler had to do his best, arriving at a diet that cost
> $39.93 per year (in 1939 dollars), or just over ten cents per day. Even that wasn’t the cheapest diet.
> In 1947, Jack Laderman used Simplex, nine calculator-wielding clerks, and 120 person-days to arrive
> at the optimal solution.

Holy contributing to the delinquency of minors, Batman, 120 person-days!  The revised simplex
implementation converges in just 8 iterations.  It's so fast that its runtime is largely
irrelevant.  And the [python call site](https://github.com/jburgy/blog/blob/main/simplex/test_smplx.py) 
isn't even scary:
```python
ind, x, z, iter = smplx(
    a=np.column_stack([*data.values()]),
    b0=np.r_[*nutrients.values()],
    c=-np.ones(len(data)),  # The routine maximizes Σⱼcⱼxⱼ so flip sign to minimize
    numge=len(nutrients),
)
```
where `ind` reports the status of the results (0 meaning solution found), `x` is the
solution vector, in this case dollars spent on each of the 77 foods plus 9
[slack variables](https://en.wikipedia.org/wiki/Slack_variable) to accommodate the inequality
constraints, `z` is the objective value, and `iter` the number of iterations that were performed.

The incongruity of building that almost 50 year FORTRAN library for the web would have
been fun. Unfortunately, that proved discouragingly
hard. [pyodide build](https://pyodide.org/en/latest/development/building-packages.html) uses
[f2c](https://www.netlib.org/f2c/f2c.pdf) whereas my native build uses
[gfortran](https://gcc.gnu.org/fortran/) and the transition is not immediately trivial.
I banged my head against a "LONG_BIT definition appears wrong for platform" issue for some time
before giving up. [lfortran](https://lfortran.org/blog/2024/05/fortran-on-web-using-lfortran/)
apparently emits WASM and is probably worth a try.
I even asking Claude to translate `SMPLX` to python but that went nowhere.  Then I
remembered [pyscript](https://pyscript.net/) and experienced instant bliss!  Take a look at the
table below.  While you were reading [above the fold](https://en.wikipedia.org/wiki/Above_the_fold),
the page sneakily fetched `pyscript`, installed a version of
[SciPy](https://scipy.org) built for the web, grabbed inputs from the
[DOM](https://docs.pyscript.net/2026.3.1/user-guide/dom/), found the cheapest diet,
and finally injected the solution _back_ in the table!  How cute is that?

|Food | Calories (kcal) | Protein (g) | Calcium (g) | Iron (mg) | Vitamin A (KIU) | Vitamin B1 (mg) | Vitamin B2 (mg) | Niacin (mg) | Vitamin C (mg) | Minimum ($) |
| :-- | --------------: | ----------: | ----------: | --------: | --------------: | --------------: | --------------: | ----------: | -------------: | ----------: |
|Daily Minimum          |   3|  70| 0.8| 12|    5| 1.8| 2.7| 18|  75||
|Wheat Flour (Enriched) |44.7|1411|   2|365|    0|55.4|33.3|441|   0||
|Macaroni               |11.6| 418| 0.7| 54|    0| 3.2| 1.9| 68|   0||
|Wheat Cereal (Enriched)|11.8| 377|14.4|175|    0|14.4| 8.8|114|   0||
|Corn Flakes            |11.4| 252| 0.1| 56|    0|13.5| 2.3| 68|   0||
|Corn Meal              |36.0| 897| 1.7| 99| 30.9|17.4| 7.9|106|   0||
|Hominy Grits           |28.6| 680| 0.8| 80|    0|10.6| 1.6|110|   0||
|Rice                   |21.2| 460| 0.6| 41|    0|   2| 4.8| 60|   0||
|Rolled Oats            |25.3| 907| 5.1|341|    0|37.1| 8.9| 64|   0||
|White Bread (Enriched) |15.0| 488| 2.5|115|    0|13.8| 8.5|126|   0||
|Whole Wheat Bread      |12.2| 484| 2.7|125|    0|13.9| 6.4|160|   0||
|Rye Bread              |12.4| 439| 1.1| 82|    0| 9.9|   3| 66|   0||
|Pound Cake             | 8.0| 130| 0.4| 31| 18.9| 2.8|   3| 17|   0||
|Soda Crackers          |12.5| 288| 0.5| 50|    0|   0|   0|  0|   0||
|Milk                   | 6.1| 310|10.5| 18| 16.8|   4|  16|  7| 177||
|Evaporated Milk (can)  | 8.4| 422|15.1|  9|   26|   3|23.5| 11|  60||
|Butter                 |10.8|   9| 0.2|  3| 44.2|   0| 0.2|  2|   0||
|Oleomargarine          |20.6|  17| 0.6|  6| 55.8| 0.2|   0|  0|   0||
|Eggs                   | 2.9| 238| 1.0| 52| 18.6| 2.8| 6.5|  1|   0||
|Cheese (Cheddar)       | 7.4| 448|16.4| 19| 28.1| 0.8|10.3|  4|   0||
|Cream                  | 3.5|  49| 1.7|  3| 16.9| 0.6| 2.5|  0|  17||
|Peanut Butter          |15.7| 661| 1.0| 48|    0| 9.6| 8.1|471|   0||
|Mayonnaise             | 8.6|  18| 0.2|  8|  2.7| 0.4| 0.5|  0|   0||
|Crisco                 |20.1|   0|   0|  0|    0|   0|   0|  0|   0||
|Lard                   |41.7|   0|   0|  0|  0.2|   0| 0.5|  5|   0||
|Sirloin Steak          | 2.9| 166| 0.1| 34|  0.2| 2.1| 2.9| 69|   0||
|Round Steak            | 2.2| 214| 0.1| 32|  0.4| 2.5| 2.4| 87|   0||
|Rib Roast              | 3.4| 213| 0.1| 33|    0|   0|   2|  0|   0||
|Chuck Roast            | 3.6| 309| 0.2| 46|  0.4|   1|   4|120|   0||
|Plate                  | 8.5| 404| 0.2| 62|    0| 0.9|   0|  0|   0||
|Liver (Beef)           | 2.2| 333| 0.2|139|169.2| 6.4|50.8|316| 525||
|Leg of Lamb            | 3.1| 245| 0.1| 20|    0| 2.8| 3.9| 86|   0||
|Lamb Chops (Rib)       | 3.3| 140| 0.1| 15|    0| 1.7| 2.7| 54|   0||
|Pork Chops             | 3.5| 196| 0.2| 30|    0|17.4| 2.7| 60|   0||
|Pork Loin Roast        | 4.4| 249| 0.3| 37|    0|18.2| 3.6| 79|   0||
|Bacon                  |10.4| 152| 0.2| 23|    0| 1.8| 1.8| 71|   0||
|Ham, smoked            | 6.7| 212| 0.2| 31|    0| 9.9| 3.3| 50|   0||
|Salt Pork              |18.8| 164| 0.1| 26|    0| 1.4| 1.8|  0|   0||
|Roasting Chicken       | 1.8| 184| 0.1| 30|  0.1| 0.9| 1.8| 68|  46||
|Veal Cutlets           | 1.7| 156| 0.1| 24|    0| 1.4| 2.4| 57|   0||
|Salmon, Pink (can)     | 5.8| 705| 6.8| 45|  3.5|   1| 4.9|209|   0||
|Apples                 | 5.8|  27| 0.5| 36|  7.3| 3.6| 2.7|  5| 544||
|Bananas                | 4.9|  60| 0.4| 30| 17.4| 2.5| 3.5| 28| 498||
|Lemons                 | 1.0|  21| 0.5| 14|    0| 0.5|   0|  4| 952||
|Oranges                | 2.2|  40| 1.1| 18| 11.1| 3.6| 1.3| 10|1998||
|Green Beans            | 2.4| 138| 3.7| 80|   69| 4.3| 5.8| 37| 862||
|Cabbage                | 2.6| 125| 4.0| 36|  7.2|   9| 4.5| 26|5369||
|Carrots                | 2.7|  73| 2.8| 43|188.5| 6.1| 4.3| 89| 608||
|Celery                 | 0.9|  51| 3.0| 23|  0.9| 1.4| 1.4|  9| 313||
|Lettuce                | 0.4|  27| 1.1| 22|112.4| 1.8| 3.4| 11| 449||
|Onions                 | 5.8| 166| 3.8| 59| 16.6| 4.7| 5.9| 21|1184||
|Potatoes               |14.3| 336| 1.8|118|  6.7|29.4| 7.1|198|2522||
|Spinach                | 1.1| 106|   0|138|918.4| 5.7|13.8| 33|2755||
|Sweet Potatoes         | 9.6| 138| 2.7| 54|290.7| 8.4| 5.4| 83|1912||
|Peaches (can)          | 3.7|  20| 0.4| 10| 21.5| 0.5|   1| 31| 196||
|Pears (can)            | 3.0|   8| 0.3|  8|  0.8| 0.8| 0.8|  5|  81||
|Pineapple (can)        | 2.4|  16| 0.4|  8|    2| 2.8| 0.8|  7| 399||
|Asparagus (can)        | 0.4|  33| 0.3| 12| 16.3| 1.4| 2.1| 17| 272||
|Green Beans (can)      | 1.0|  54|   2| 65| 53.9| 1.6| 4.3| 32| 431||
|Pork and Beans (can)   | 7.5| 364|   4|134|  3.5| 8.3| 7.7| 56|   0||
|Corn (can)             | 5.2| 136| 0.2| 16|   12| 1.6| 2.7| 42| 218||
|Peas (can)             | 2.3| 136| 0.6| 45| 34.9| 4.9| 2.5| 37| 370||
|Tomatoes (can)         | 1.3|  63| 0.7| 38| 53.2| 3.4| 2.5| 36|1253||
|Tomato Soup (can)      | 1.6|  71| 0.6| 43| 57.9| 3.5| 2.4| 67| 862||
|Peaches, Dried         | 8.5|  87| 1.7|173| 86.8| 1.2| 4.3| 55|  57||
|Prunes, Dried          |12.8|  99| 2.5|154| 85.7| 3.9| 4.3| 65| 257||
|Raisins, Dried         |13.5| 104| 2.5|136|  4.5| 6.3| 1.4| 24| 136||
|Peas, Dried            |20.0|1367| 4.2|345|  2.9|28.7|18.4|162|   0||
|Lima Beans, Dried      |17.4|1055| 3.7|459|  5.1|26.9|38.2| 93|   0||
|Navy Beans, Dried      |26.9|1691|11.4|792|    0|38.4|24.6|217|   0||
|Coffee                 |   0|   0|   0|  0|    0|   4| 5.1| 50|   0||
|Tea                    |   0|   0|   0|  0|    0|   0| 2.3| 42|   0||
|Cocoa                  | 8.7| 237|   3| 72|    0|   2|11.9| 40|   0||
|Chocolate              | 8.0|  77| 1.3| 39|    0| 0.9| 3.4| 14|   0||
|Sugar                  |34.9|   0|   0|  0|    0|   0|   0|  0|   0||
|Corn Syrup             |14.7|   0| 0.5| 74|    0|   0|   0|  5|   0||
|Molasses               | 9.0|   0|10.3|244|    0| 1.9| 7.5|146|   0||
|Strawberry Preserves   | 6.4|  11| 0.4|  7|  0.2| 0.2| 0.4|  3|   0||

<script type="module" src="https://pyscript.net/releases/2026.3.1/core.js"></script>
<script type="py" config='{"packages":["scipy"]}'>
import numpy as np
from pyscript import web
from scipy import optimize

data = -np.column_stack(
    [
        [float(t.textContent) for t in row[1:-1]]
        for row in web.page.find("table>tbody>tr")
    ]
)
sol = optimize.linprog(
    A_ub=data[:, 1:],
    b_ub=data[:, 0],
    c=np.ones(77),
)
rows = iter(web.page.find("table>tbody>tr"))
next(rows)[-1].textContent = format(sol.fun * 365, ".2f")
for row, y in zip(rows, sol.x * 365):
    row[-1].textContent = format(y, ".2f") if y else "0"
</script>
