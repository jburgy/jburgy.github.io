---
layout: post
title:  "How much can you pack into bytes?"
date:   2025-01-21 13:26:26 -0500
---

I like [Zig](https://ziglang.org/) because it encourages me to pay attention to details when I use
it.  I have recently come up with an interesting pattern in two separate use cases.  I think it
warrants a quick blog post.  The pattern is a curious mix of abstraction levels.  On the one hand,
it's high-level because it prefers Zig's 
[std.ArrayList](https://ziglang.org/documentation/master/std/#std.array_list.ArrayList)
over the lower level
[std.mem.Allocator](https://ziglang.org/documentation/master/std/#std.mem.Allocator).
On the other, it's low-level because it works best when you take memory alignment into account.
The TL;DR version is that I use `std.ArrayList` as a special-purpose
[std.heap.ArenaAllocator](https://ziglang.org/documentation/master/std/#std.heap.ArenaAllocator).
This opens a memory saving opportunity by converting pointers to indices.

## Flattening ASTs

The first use case happened by of a confluence of 3 events:

* I [struggled with a memory leak](https://discord.com/channels/605571803288698900/1325848433965400105)
in a hand-written [recursive descent parser](https://en.wikipedia.org/wiki/Recursive_descent_parser)
* I read [Adrian Sampson](https://www.cs.cornell.edu/~asampson/)'s
[Flattening ASTs (and Other Compiler Data Structures)](https://www.cs.cornell.edu/~asampson/blog/flattening.html)
* I recalled watching [Andrew Kelly](https://andrewkelley.me/)'s
[Practical Data Oriented Design (DoD)](https://www.youtube.com/watch?v=IroPQ150F6c)

Although I didn't realize it at the time, one sentence in Adrian's post summarizes the idea:
"_Arenas_ or _regions_ mean many different things to different people, so I'm going to call
the specific flavor I'm interested in here _data structure flattening_."  My initial motivation
was that I didn't like how a seemingly simple `Node` data structure required such a complex
`.destroy` method:

```zig
const Node = struct {
    token: Token,
    args: []const *const Node,

    pub fn destroy(self: *Node, allocator: Allocator) void {
        for (self.args) |arg| arg.destroy(allocator);
        allocator.free(self.args);
        allocator.destroy(self);
    }
};
```

[Cloudef suggested an arena](https://discord.com/channels/605571803288698900/1325848433965400105/1325857847917154325)
but I was reluctant because I feared it would create too much
[coupling](https://en.wikipedia.org/wiki/Coupling_(computer_programming)) between a type and the allocator
that creates its instances.  Teralux also warned that
["[f]reeing graphs is generally a slow operation."](https://discord.com/channels/605571803288698900/1325848433965400105/1325860143820439585)  Furthermore, echoes of Andrew's "Data Oriented Design" talk were still brewing in my
left hippocampus.  I put them all together into

```zig
pub const Node = packed union {
    head: packed struct(u32) { token: u24, count: u8 },
    node: u32,
};
```

This definition replaces a _copy_ of each token by an index _into_ `[]const Token`
(weighing in at a mere `3` bytes intead of `24`).  It also broke up `[]const *const Node` into
a 1-byte `count` squeezed with the token followed by _indices_ into `[]const Node`.  The memory
footprint of the old `Node` was `10 + 8n` bytes where `n = node.args.len`:

* `.token.tag`: `8` bytes
* `.token.src.ptr`: `8` bytes
* `.token.src.len`: `8` bytes
* `.args.ptr`: `8` bytes
* `.args.len`: `8` bytes
* each additional `arg: *const Node`: `8` bytes

The new `Node`, by contrast, only occupies `4` bytes.
That's a 2½-fold size reduction for a node with zero arguments and 2⅙-fold for a binary node!
Of course, the main attraction is that `nodes` can be freed using either `nodes.deinit()`
if you're still holding a reference to the `std.ArrayList` or `allocator.free(nodes)` if you
have invoked `.toOwnedSlice()` instead.

## Hybrid bump allocator

The second use case for this idea goes back to
[my first Zig project]({% post_url 2024-08-31-why-not-zig %}):
I initially [failed to grok ArrayList](https://discord.com/channels/605571803288698900/1254033012299927573).
This first project was translating a [C](https://en.wikipedia.org/wiki/C_(programming_language))
implementation of [FORTH](https://en.wikipedia.org/wiki/C_(programming_language)) (which in turn
was translating an [x86](https://en.wikipedia.org/wiki/X86) implementation).  As a consequence,
focus was more on how than why.  Re-reading my discord question, I realize now that I lacked
the vocabulary to precisely articulate what I was trying to achieve.  The original x86 was using
[brk(2)](https://man7.org/linux/man-pages/man2/brk.2.html) and raw pointers to implement a
[bump allocator](https://en.wikipedia.org/wiki/Region-based_memory_management) which supports
individual bytes (for `C!` and `@`), words (for `C!` and `C@`), and code addresses (for `,`).
I didn't make the effort to understand `std.ArrayList` to see which parts lent themselves to my
purpose.  The trick turned out to be

```zig
fn InterpAligned(comptime alignment: u29) type {
    return struct {
        state: isize,
        latest: *Word,
        s0: [*]const isize,
        base: isize,
        r0: [*]const [*]const Instr,
        buffer: [32]u8,
        memory: std.ArrayListAligned(u8, alignment),  // ⇐ here
        here: [*]u8,

        ...
    };
}

const Interp = InterpAligned(@alignOf(Instr));
```

(Had to make it a [generic](https://ziglang.org/documentation/master/#Generic-Data-Structures)
to avoid the dreaded `struct Instr depends on itself`).  `Interp.memory.items` are a slice of
bytes for maximum flexibility but they're `Instr`-_aligned_ which obviates the manual
alignment math in `CREATE`.

## Artificial constraints

[Mitchell Hashimoto](https://mitchellh.com/) said something on
[Changelog](https://changelog.com/podcast/622) which resonated with me: embrace constraints
when programming.  Programmers often have a tendency to go for the most generic
solution.  This leads to unnecessary complexity and 
[anti-patterns](https://en.wikipedia.org/wiki/Anti-pattern) like
[softcoding](https://en.wikipedia.org/wiki/Hard_coding#Softcoding) or
[Greenspun's tenth rule](https://en.wikipedia.org/wiki/Greenspun%27s_tenth_rule).
In this case, the constraint was making sure that consecutive memory allocations
remain contiguous to facilitate FORTH's poor man's 
[reflection](https://en.wikipedia.org/wiki/Reflective_programming).
After a few detours, the constraint took me to a reasonably useful idea.
Meanwhile, my code remained legible and efficient in the process.
