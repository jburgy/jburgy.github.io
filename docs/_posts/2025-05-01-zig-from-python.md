---
layout: post
title:  "How do you call Zig from python?"
date:   2025-05-01 09:27:41 -0500
---

5/19/25 update: See my [Zig NYC #4](https://zignyc.github.io/)
[slides](https://html-preview.github.io/?url=https://github.com/jburgy/blog/blob/main/talks/pydust.html)

As this [previous post]({% post_url 2024-08-31-why-not-zig %}) demonstrates,
I rather enjoy [Zig](https://ziglang.org/).  However, software I write
professionally is almost exclusively in [python](https://www.python.org/).
Now, because [CPython](https://github.com/python/cpython) is the most common
implementation, people commonly write performance critical parts of their
python applications in [C](https://en.wikipedia.org/wiki/C_(programming_language)).
There is an [official tutorial](https://docs.python.org/3/extending/extending.html)
documenting that process.  The amount of boilerplate required stands out rather
quickly in that tutorial.  People have come up with a number of utilities to
mitigate that boilerplate including, but not limited to, 
[ctypes](https://docs.python.org/3/library/ctypes.html),
[Cython](https://cython.org/),
[CFFI](https://cffi.rtfd.io/),
[SWIG](https://www.swig.org/),
[F2PY](https://numpy.org/doc/stable/f2py/index.html),
or [pybind11](http://pybind11.rtfd.io/).

At the same time, Zig advertises its 
[integration with C libraries without FFI/bindings](https://ziglang.org/learn/overview/#integration-with-c-libraries-without-ffibindings).
Moreover, Zig also offers
[compile-time reflection and compile-time code execution](https://ziglang.org/learn/overview/#compile-time-reflection-and-compile-time-code-execution)
which can surely mitigate boilerplate.
It stands to reason that Zig is a good candidate to
implement performance-critical sections.  The fine folks at [spiral](https://spiraldb.com/)
realized that opportunity and released [Ziggy Pydust](https://pydust.fulcrum.so/latest/)
in 2023.  They focused a great deal of energy on ergonomics as illustrated by their
first example:
```zig
const py = @import("pydust");

pub fn fibonacci(args: struct { n: u64 }) u64 {
    if (args.n < 2) return args.n;

    var sum: u64 = 0;
    var last: u64 = 0;
    var curr: u64 = 1;
    for (1..args.n) {
        sum = last + curr;
        last = curr;
        curr = sum;
    }
    return sum;
}

comptime {
    py.rootmodule(@This());
}
```

Unfortunately for them, Zig has not reached 
[one ver](https://en.wikipedia.org/wiki/Software_versioning#Version_1.0_as_a_milestone)
and makes virtually no promise of stability.  True to that spirit, Zig 0.12
banned [global mutable comptime state](https://ziggit.dev/t/comptime-mutable-memory-changes/3702#what-about-my-global-mutable-comptime-state-3) which
Ziggy Pydust [relied on heavily](https://github.com/spiraldb/ziggy-pydust/discussions/428).
Ziggy Pydust was stuck on Zig 0.11 and upgrading "isn't an easy thing to do."  Such was the
state of affairs when I came across Ziggy Pydust.  And that's when I remembered
[Larry Wall](http://www.wall.org/~larry/)'s [three virtues](https://threevirtues.dev/).

Laziness
: There are so many thing I should be doing instead of this, sounds like a great excuse to procrastinate!

Impatience
: What do you mean "We can try to reach consensus"?  I want to be able to write python extensions in Zig now!

Hubris
: What do you mean "This isn't an easy thing to do"?  Surely I am clever or at the very least stubborn enough!

So I made the rather ill-advised decision to throw my hat in that race.  Much to his credit,
[Nicholas Gates](https://github.com/gatesn) pointed me straight to the 
[problem area](https://github.com/spiraldb/ziggy-pydust/discussions/428#discussioncomment-12303082)
and please believe me when I say that I tried
[a lot of approaches](https://github.com/spiraldb/ziggy-pydust/discussions/428#discussioncomment-12671308).
I ended up finding one approach leveraging
[comptime memoization](https://ziglang.org/documentation/master/#struct).
Unfortunately, this approach also requires passing the top-level (`root`) type all the way
down the call stack.  Depending on 
[who you ask](https://softwareengineering.stackexchange.com/questions/335005/is-there-a-name-for-the-anti-pattern-of-passing-parameters-that-will-only-be),
this is either an anti-pattern called
["tramp data"](https://en.wiktionary.org/wiki/tramp_data) or, more generously,
a pattern called ["Dependency Injection"](https://en.wikipedia.org/wiki/Dependency_injection).
For what it's worth, I admitted to not being a fan of what I called this
"root pollution" in private emails with 
[Robert Kruszewski](https://github.com/robert3005) where I was asking (nay begging) him
to review [#429](https://github.com/spiraldb/ziggy-pydust/pull/429).  In the end, I reasoned
that passing an extra argument around felt like a fitting substitute for
[global state](https://news.ycombinator.com/item?id=9874824).

Now the good news, bad news of it all.  Ziggy Pydust is no longer stuck on zig 0.11.
I think we can all agree that's reasonably good news.  This work paved the way
for [@bridgeQiao](https://github.com/bridgeQiao) to update Ziggy Pydust to
[zig 0.14](https://github.com/spiraldb/ziggy-pydust/pull/441)!  On the flip side, I saw
no way but to break the Ziggy Pydust API.

Before [#429](https://github.com/spiraldb/ziggy-pydust/pull/429):
```zig
const py = @import("pydust");

pub fn hello() !py.PyString {
    return try py.PyString.create("Hello!");
}

comptime {
    py.rootmodule(@This());
}
```

After [#429](https://github.com/spiraldb/ziggy-pydust/pull/429):
```zig
const py = @import("pydust");

const root = @This();

pub fn hello() !py.PyString(root) {
    return try py.PyString(root).create("Hello!");
}

comptime {
    py.rootmodule(root);
}
```

And for that,
<div style="padding-top:42.600%;position:relative;">
    <iframe src="https://gifer.com/embed/RJ8L" width="100%" height="100%" style='position:absolute;top:0;left:0;' frameBorder="0" allowFullScreen>
    </iframe>
</div>
