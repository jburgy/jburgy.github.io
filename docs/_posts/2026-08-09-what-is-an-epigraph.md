---
layout: post
title:  "What Is an Epigraph?"
date:   2026-08-08 11:18:41 -0500
---
## Linear Programming Advanced Tricks and Techniques

We introduced [Linear Programming](https://en.wikipedia.org/wiki/Linear_programming)
in an [earlier post]({% post_url 2022-05-13-what-is-linear-programming %}) but its
popularity is still surprising.  How can such an apparently restrictive technique find
applications in so many fields?  Clever users have developed many tricks to push the
technique beyond its obvious scope.  Some of these tricks are worth understanding.

### Helper Variables and Epigraphs

Most [algebraic modeling languages](https://en.wikipedia.org/wiki/Algebraic_modeling_language)
for linear programming support basic functions like $$|x|$$ and other piecewise
linear functions.  These are often implemented via their 
[epigraphs](https://en.wikipedia.org/wiki/Epigraph_(mathematics)).  Don't let
the fancy word scare you, the idea is simple enough: first you introduce a new
decision variable $$y$$ and two constraints ($$y \geq x$$ and $$y \geq -x$$).  The
constraints mean that $$y$$ lies anywhere in the blue region in the chart below.

<div style="display: flex; justify-content: center;">
<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
    <!-- Define the clipping region for the chart area -->
    <defs>
        <clipPath id="chartArea">
            <rect x="80" y="30" width="480" height="340"/>
        </clipPath>
    </defs>

    <!-- Background -->
    <rect width="600" height="400" fill="white"/>

    <!-- Chart area background -->
    <rect x="80" y="30" width="480" height="340" fill="#f8f9fa" stroke="#333" stroke-width="1"/>

    <!-- Grid lines (horizontal) - y = 0 to 10 -->
    <line x1="80" y1="370" x2="560" y2="370" stroke="#ddd" stroke-width="0.5"/>
    <line x1="80" y1="336" x2="560" y2="336" stroke="#ddd" stroke-width="0.5"/>
    <line x1="80" y1="302" x2="560" y2="302" stroke="#ddd" stroke-width="0.5"/>
    <line x1="80" y1="268" x2="560" y2="268" stroke="#ddd" stroke-width="0.5"/>
    <line x1="80" y1="234" x2="560" y2="234" stroke="#ddd" stroke-width="0.5"/>
    <line x1="80" y1="200" x2="560" y2="200" stroke="#ddd" stroke-width="0.5"/>
    <line x1="80" y1="166" x2="560" y2="166" stroke="#ddd" stroke-width="0.5"/>
    <line x1="80" y1="132" x2="560" y2="132" stroke="#ddd" stroke-width="0.5"/>
    <line x1="80" y1="98" x2="560" y2="98" stroke="#ddd" stroke-width="0.5"/>
    <line x1="80" y1="64" x2="560" y2="64" stroke="#ddd" stroke-width="0.5"/>
    <line x1="80" y1="30" x2="560" y2="30" stroke="#ddd" stroke-width="0.5"/>

    <!-- Grid lines (vertical) - x = -10 to 10 -->
    <line x1="80" y1="30" x2="80" y2="370" stroke="#ddd" stroke-width="0.5"/>
    <line x1="128" y1="30" x2="128" y2="370" stroke="#ddd" stroke-width="0.5"/>
    <line x1="176" y1="30" x2="176" y2="370" stroke="#ddd" stroke-width="0.5"/>
    <line x1="224" y1="30" x2="224" y2="370" stroke="#ddd" stroke-width="0.5"/>
    <line x1="272" y1="30" x2="272" y2="370" stroke="#ddd" stroke-width="0.5"/>
    <line x1="320" y1="30" x2="320" y2="370" stroke="#ddd" stroke-width="0.5"/>
    <line x1="368" y1="30" x2="368" y2="370" stroke="#ddd" stroke-width="0.5"/>
    <line x1="416" y1="30" x2="416" y2="370" stroke="#ddd" stroke-width="0.5"/>
    <line x1="464" y1="30" x2="464" y2="370" stroke="#ddd" stroke-width="0.5"/>
    <line x1="512" y1="30" x2="512" y2="370" stroke="#ddd" stroke-width="0.5"/>
    <line x1="560" y1="30" x2="560" y2="370" stroke="#ddd" stroke-width="0.5"/>

    <!-- EPIGRAPH: Area ABOVE y = |x| (filled in blue) -->
    <!-- 
        To fill ABOVE the V shape, the polygon traces:
        1. Start at top-left (x=-10, y=10)
        2. Go right along the top edge to (x=10, y=10)
        3. Follow the V shape from right to left: 
           (10,10) → (0,0) → (-10,10)
        4. Close back to start
        
        This creates a polygon where the V shape is the BOTTOM boundary,
        so the area ABOVE it is filled.
    -->
    <polygon points="
        80,30
        320,370
        560,30
        80,30
    " fill="rgba(0, 100, 255, 0.3)" stroke="none" clip-path="url(#chartArea)"/>

    <!-- The curve y = |x| -->
    <polyline points="
        80,30
        320,370
        560,30
    " fill="none" stroke="#0066cc" stroke-width="2.5" clip-path="url(#chartArea)"/>

    <!-- Axes -->
    <!-- X-axis (y=0) -->
    <!-- line x1="80" y1="370" x2="560" y2="370" stroke="#333" stroke-width="2"/ -->
    <!-- Y-axis (x=0) -->
    <!-- line x1="320" y1="30" x2="320" y2="370" stroke="#333" stroke-width="2"/ -->

    <!-- X-axis ticks and labels -->
    <text x="80" y="390" font-family="Arial" font-size="12" text-anchor="middle">-10</text>
    <text x="128" y="390" font-family="Arial" font-size="12" text-anchor="middle">-8</text>
    <text x="176" y="390" font-family="Arial" font-size="12" text-anchor="middle">-6</text>
    <text x="224" y="390" font-family="Arial" font-size="12" text-anchor="middle">-4</text>
    <text x="272" y="390" font-family="Arial" font-size="12" text-anchor="middle">-2</text>
    <text x="320" y="390" font-family="Arial" font-size="12" text-anchor="middle">0</text>
    <text x="368" y="390" font-family="Arial" font-size="12" text-anchor="middle">2</text>
    <text x="416" y="390" font-family="Arial" font-size="12" text-anchor="middle">4</text>
    <text x="464" y="390" font-family="Arial" font-size="12" text-anchor="middle">6</text>
    <text x="512" y="390" font-family="Arial" font-size="12" text-anchor="middle">8</text>
    <text x="560" y="390" font-family="Arial" font-size="12" text-anchor="middle">10</text>

    <!-- X-axis label -->
    <text x="320" y="415" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle">x</text>

    <!-- Y-axis ticks and labels -->
    <text x="70" y="374" font-family="Arial" font-size="12" text-anchor="end">0</text>
    <text x="70" y="336" font-family="Arial" font-size="12" text-anchor="end">1</text>
    <text x="70" y="302" font-family="Arial" font-size="12" text-anchor="end">2</text>
    <text x="70" y="268" font-family="Arial" font-size="12" text-anchor="end">3</text>
    <text x="70" y="234" font-family="Arial" font-size="12" text-anchor="end">4</text>
    <text x="70" y="200" font-family="Arial" font-size="12" text-anchor="end">5</text>
    <text x="70" y="166" font-family="Arial" font-size="12" text-anchor="end">6</text>
    <text x="70" y="132" font-family="Arial" font-size="12" text-anchor="end">7</text>
    <text x="70" y="98" font-family="Arial" font-size="12" text-anchor="end">8</text>
    <text x="70" y="64" font-family="Arial" font-size="12" text-anchor="end">9</text>
    <text x="70" y="34" font-family="Arial" font-size="12" text-anchor="end">10</text>

    <!-- Y-axis label (rotated) -->
    <text x="25" y="200" font-family="Arial" font-size="14" font-weight="bold" text-anchor="middle" transform="rotate(-90, 25, 200)">y</text>

    <!-- Title -->
    <text x="320" y="20" font-family="Arial" font-size="16" font-weight="bold" text-anchor="middle">Epigraph: y ≥ |x|</text>

    <!-- Legend -->
    <rect x="440" y="35" width="12" height="12" fill="rgba(0, 100, 255, 0.3)" stroke="#0066cc" stroke-width="1.5"/>
    <text x="458" y="46" font-family="Arial" font-size="11">y ≥ |x|</text>
</svg>
</div>

The trick is to make sure that $$y$$ enters the objective with a positive coefficient so
that the minimization collapses to the smallest feasible value.  If we minimize $$y$$ subject
to $$y \ge x$$ and $$y \ge -x$$, the best we can do is exactly $$|x|$$.  The language of
mathematics calls that set of points "above" the graph the epigraph:
$$
\operatorname{epi}(f) = \{(x, y) : y \ge f(x)\}.
$$
The useful part, of course, is that this gives a way to represent a whole family of
nasty-looking functions as a linear program.  Want to minimize an absolute value?
Introduce a helper variable and bound it above by the relevant piecewise-linear expression.
Want a maximum, a hinge loss, or a piecewise cost?  The same pattern often works.
This is why a modeling language can support things like $$|x|$$, $$\max_i x_i$$, and
other convex piecewise-linear objects without ever letting the solver see anything
more exotic than a few extra variables and constraints.

That same general instinct shows up in performance work too.  The discovery from
[the shared note](https://share.google/aimode/tJO1RNBSGUOjOQmcw) was that a simple-looking
expression like $$x - \sum_i x_i$$ can trigger terrible scaling because it keeps reusing and
recomputing the same shared term over and over.  The fix is conceptually the same as the
epigraph trick: introduce a temporary variable, cache the common subexpression, and rewrite
it so the model exposes the real structure instead of forcing the solver to rediscover it.
In [cvxpy/cvxpy#3479](https://github.com/cvxpy/cvxpy/issues/3479), the reported slowdown was
very dramatic—something like a quadratic-to-cubic-looking blowup in runtime—while a rewrite
that cached the shared sum brought the scaling back to near-linear.  The lesson is simple:
if you can make the hidden structure explicit, you often get both a cleaner model and,
more importantly, a much faster one.
