---
layout: post
title:  "What Makes a Computation Incremental?"
date:   2026-09-25 00:00:00 -0400
---

In 2015, Yaron Minsky announced [Incremental](https://blog.janestreet.com/introducing-incremental/),
Jane Street's library for _self-adjusting computations_. He describes them as "a fancy
spreadsheet": every cell holds either data or a formula over other cells, and when some
cells change, only the formulas that depend on them are recomputed. Finance runs on
spreadsheets, so it's not surprising that trading firms keep reinventing this. My own
take was inspired by Goldman Sachs' UFO (Universal Financial Object) graph and fits in
a few dozen lines of Python.

## Two hard things

[Phil Karlton](https://martinfowler.com/bliki/TwoHardThings.html) famously said that the
two hard things in computer science are cache invalidation and naming things. The
standard library already solves half of the first one. Decorate a function with
[`functools.cache`](https://docs.python.org/3/library/functools.html#functools.cache)
and it never computes the same thing twice. What it can't do is forget a result when
the result goes stale. For that, every cached value needs to know who used it, so that
when it changes it can tell them to forget too.

Incremental makes you spell out those edges: `Inc.map2 width depth ~f:( *. )` says that
the new node depends on `width` and `depth`. UFO found them for you, but ahead of time:
it built the graph by static analysis of the code. That restricted how dynamic the code
could be, and the team took great pains to reintroduce some of those dynamic features as
what they called "purple" nodes. I'd rather write plain Python functions and have the
edges discovered at run time, so the graph is exactly as dynamic as the code. The trick
is a stack. While a function runs, its node sits on top of the stack. Any node read
during that time is read _by_ the node on top, so it records that node as a dependent:

{% include pyscript.html %}

<script type="py-editor" env="dag">
from functools import cache, cached_property, wraps


class Node:
    stack: list["Node"] = []

    def __init__(self, func, *args):
        self.func, self.args = func, args
        self.dependents = set()

    def __repr__(self):
        return f"{self.func.__name__}({', '.join(map(repr, self.args))})"

    def __enter__(self):
        self.dependents.update(self.stack[-1:])
        self.stack.append(self)
        return self

    def __exit__(self, *exc_info):
        self.stack.pop()

    @cached_property
    def value(self):
        print(f"{'  ' * (len(self.stack) - 1)}compute {self}")
        return self.func(*self.args)

    def invalidate(self, depth=0):
        if "value" in self.__dict__:
            print(f"{'  ' * depth}invalidate {self}")
            del self.value
            for node in self.dependents:
                node.invalidate(depth + 1)


def dagify(func):
    @cache
    def node(*args):
        return Node(func, *args)

    @wraps(func)
    def wrapper(*args):
        with node(*args) as n:
            return n.value

    wrapper.node = node
    return wrapper
</script>

That's the whole engine; the two `print` calls are only there for the trace. `dagify`
keeps one `Node` per distinct set of arguments. Calling the decorated function enters
that node's `with` block, which records the caller and then reads `value`.
[`cached_property`](https://docs.python.org/3/library/functools.html#functools.cached_property)
does the memoization: the first read calls the function and stores the result in the
instance `__dict__`, and later reads return it straight from there. `invalidate` deletes
the stored result and passes the news on to every dependent. It stops at nodes that are
already invalid. That keeps the work proportional to what actually changed and handles
diamonds, where one node reaches another along two paths.

## A small book

Here is a toy position-keeping graph: two stock positions priced in dollars, reported in
euros. `tick` plays the market data feed. It updates a quote, then invalidates that
quote's node. The editors share an interpreter, so run the one above first:

<script type="py-editor" env="dag">
market = {"AAPL": 230.0, "MSFT": 510.0, "EURUSD": 1.17}
positions = {"AAPL": 100, "MSFT": 50}


@dagify
def quote(symbol):
    return market[symbol]


@dagify
def value(ticker):
    return positions[ticker] * quote(ticker)


@dagify
def book():
    return sum(value(ticker) for ticker in positions) / quote("EURUSD")


def tick(symbol, price):
    market[symbol] = price
    quote.node(symbol).invalidate()


print(f"book = €{book():,.2f}\n")
print(f"book = €{book():,.2f}\n")
tick("AAPL", 231.5)
print(f"book = €{book():,.2f}\n")
tick("EURUSD", 1.18)
print(f"book = €{book():,.2f}")
</script>

Read the trace from the top. The first `book()` computes everything, and the indentation
draws the graph it just discovered. The second `book()` prints nothing because every
node is cached. The Apple tick invalidates upward through `value('AAPL')` to `book()`.
The next read recomputes only those three nodes and reuses `value('MSFT')` and
`quote('EURUSD')`. The currency tick skips the positions entirely: only `book()` has to
divide again.

## Compared with Incremental

The two designs make opposite choices in a few places:

* **Building the graph.** Incremental builds it from combinators (`map`, `map2`, `bind`).
  `dagify` builds it from ordinary function calls, so every read acts like a `bind`: the
  dependencies are whatever the code happened to call this time.
* **When recomputation happens.** `Var.set` in Incremental marks inputs as changed,
  and `stabilize` then recomputes, in order of height, the necessary nodes: those some
  observer depends on. `tick` pushes invalidation out immediately but recomputes nothing.
  Values get pulled back in on the next read, and the call order puts them in topological
  order for free.
* **Cutoffs.** Incremental can stop propagating when a node recomputes to the same value.
  `dagify` can't, because invalidation runs before anything is recomputed. A tick that
  leaves the price unchanged still dirties `book()`.
* **Stale edges.** When a `bind` switches branches, Incremental drops the old
  dependencies. A `Node` only ever adds dependents. If `book` stopped calling
  `value('MSFT')`, an MSFT tick would still invalidate it: wasted work, but never a wrong
  answer.

Minsky quotes about 30ns to fire a single Incremental node. On my laptop, a cached read
through `dagify` costs about 300ns. That's not the same operation, but it's the right
order of magnitude for the Python tax. Like Incremental, this pays off when each node
does real work, or when the graph is much larger than the part that changes.

Two caveats if you take this beyond a blog post. `functools.cache` never evicts, and a
bounded `lru_cache` isn't a safe substitute. If it evicted a node, a dependent would
keep its cached value while the new node that replaced it would have no record of that
dependent, so the next invalidation would miss it. And `Node.stack` is shared by every
thread, so concurrent reads would record each other as dependents.
