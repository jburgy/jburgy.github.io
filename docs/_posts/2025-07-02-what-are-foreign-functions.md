---
layout: post
title:  "Why are some functions foreign?"
date:   2025-07-02 16:04:02 -0500
---

In real-world software, layers accumulate like archeological
[stratigraphy](https://en.wikipedia.org/wiki/Stratigraphy_(archaeology)).
I recently cooked up a little utility which ended up touching layers spanning several
decades.  It all started when I found the 
[official recommendation](https://github.com/awsdocs/aws-lambda-developer-guide/blob/main/sample-apps/layer-python/layer/2-package.sh)
from AWS to create a [python layer](https://docs.aws.amazon.com/lambda/latest/dg/python-layers.html)
underwhelming.

Per the [AWS documentation](https://docs.aws.amazon.com/lambda/latest/dg/python-layers.html#python-layers-package),
a layer is a `.zip` archive which includes a `python` top-level directory.  That root
directory contains the `platlib` path of the relevant
[virtual environment](https://docs.python.org/3/glossary.html#term-virtual-environment).
The [AWS Lambda Developer Guide](https://github.com/awsdocs/aws-lambda-developer-guide)
addresses this in 3 steps:

1. create a new directory named `python` (`mkdir`)
2. copy `<venv>/lib` _recursively_ to the newly created `python` (`cp -r`)
3. zip the `python` directory _recursively_ (`zip -r`)

This is objectively silly.  You shouldn't need to copy an entire folder just so you can rename it.
[7-Zip](https://www.7-zip.org/) lets you rename files (even folders) inside a zip archive in-place.
But that still requires two separate commands (oh, the humanity)!  But hang on, the
[python standard library](https://docs.python.org/3/library/zlib.html) supports the 
[ZIP format](https://en.wikipedia.org/wiki/ZIP_(file_format))!  And if you're worried about
performance, fear not, python's `zlib` is a [C wrapper](https://github.com/python/cpython/blob/main/Modules/zlibmodule.c)
around this [zlib](https://www.zlib.net/).

So we can write a simple python program that looks roughly like
```python
platlib = Path(sysconfig.get_path("platlib"))
data = Path(sysconfig.get_path("data"))

with ZipFile(args.zipfile, "w") as zf:
    for root, _, files in platlib.walk():
        arcroot = Path("python") / root.relative_to(data)
        for file in files:
            zf.write(filename=root / file, arcname=arcroot / file)
```

(slightly circular to package your own virtual environment but very reasonable if you think about it.)
This is great but it runs for a while and gives you no sense of what it's doing.  Gotta fix that.

And this is where the story gets interesting because I decided to get cute.  I didn't want my utility
to just "vomit" a wall of text to its standard output.  That's not particularly helpful.  It would be
much more helpful to update one or a few lines of output as we progress.  I knew that was possible but
the details were hazy.  So I read up on 
[Control Sequence Introducer](https://en.wikipedia.org/wiki/ANSI_escape_code#Control_Sequence_Introducer_commands)
commands.  Unfortunately, `python` does not [understand](https://docs.python.org/3/reference/lexical_analysis.html#escape-sequences) 
`"\e"` like [Bash](https://tldp.org/LDP/Bash-Beginners-Guide/html/Bash-Beginners-Guide.html#tab_08_01).
People often use `"\033"` or `"\x1b"` instead but that's not super readable.  Fear not, `python`
accepts `"\N{escape}"` which is rather readable.  With that,
```python
print(f"\N{escape}[{n}F\N{escape}[J", end="")
```

F (or Cursor Previous Line) "moves the cursor to beginning of the line _n_ (default 1) lines up" then
J (or Erase in Display) "clears part of the screen. If _n_ is 0 (or missing), clear from cursor to end of screen."
Printing this rather cryptic screen lets you print some a few lines (like, for example, the last _n_ files
added to the archive), erase them, and print them more.  The refresh rate on your terminal is likely high
enough that your output looks animated.  Furthermore, you can use
[`collections.deque`](https://docs.python.org/3/library/collections.html#collections.deque)'s _maxlen_
parameter to easily keep track of those last _n_ files.  That's quite nice but is it nice enough?

Actually, one can use [box-drawing characters](https://en.wikipedia.org/wiki/Box-drawing_characters) to
make those few lines look like the output of [`tree`](https://en.wikipedia.org/wiki/Tree_(command)).
That lets you shrink the width of the output since virtual environments nest, leading
to long paths. (Funny side note, my initial implementation was not always clearing the screen
properly because it didn't account for line wraps requiring clearing more lines than printed).  At
that point, I remembered that building zig generated precisely that kind of "scrolling tree" output.
A quick web search took me to
[Zig's New CLI Progress Bar Explained](https://ziggit.dev/t/zigs-new-cli-progress-bar-explained/4499).
Yikes, Andrew really went nuts on that "infallible and non-heap-allocating" implementation!  For once,
my [laziness](https://wiki.c2.com/?LazinessImpatienceHubris) beat out my hubris and I decided to not
reimplement [`Progress.zig`](https://github.com/ziglang/zig/blob/master/lib/std/Progress.zig) in python.
Instead, I decided to _expose_ it to python.

As luck would have it, I recently explored
[How do you call Zig from python?]({% post_url 2025-05-01-zig-from-python %}) With that knowledge,
I quickly whipped up
```c
const std = @import("std");
const py = @import("pydust");

const root = @This();

pub const Progress = py.class(struct {
    const Self = @This();
    index: std.Progress.Node.OptionalIndex,

    pub fn __init__(self: *Self) !void {
        self.index = std.Progress.start(.{}).index;
    }

    pub fn start(
        self: *const Self,
        args: struct { name: py.PyString, estimated_total_items: usize },
    ) !*const Self {
        const parent: std.Progress.Node = .{ .index = self.index };
        const node = parent.start(try args.name.asSlice(), args.estimated_total_items);
        return py.init(root, Self, .{ .index = node.index });
    }

    pub fn end(self: *const Self) void {
        const node: std.Progress.Node = .{ .index = self.index };
        node.end();
    }

    pub fn complete_one(self: *const Self) void {
        const node: std.Progress.Node = .{ .index = self.index };
        node.completeOne();
    }
});

comptime {
    py.rootmodule(root);
}
```
based on [`zp.zig`](https://andrewkelley.me/post/zig-new-cli-progress-bar-explained.html#zp.zig)
(with thanks to [`@bridgeQiao`](https://github.com/bridgeQiao) for removing `root` where it was
not strictly needed).

Writing the code was trivial but getting [meson-python](https://mesonbuild.com/meson-python/)
to build and install it was a real trip, see
[mesonbuild/meson#14763](https://github.com/mesonbuild/meson/discussions/14763).  And it made
[CI](https://github.com/jburgy/blog/actions) almost 30s slower!  I started wondering how much
Ziggy Pydust's comptime magic contributed to that slowdown so I 
[ripped it out](https://github.com/jburgy/blog/pull/3)!  That led me to discover and
[report a bug](https://github.com/ziglang/zig/issues/24413) with the Zig toolchain.  And the
savings were barely noticeable.  But, as the poet laureate of 
[Bed-Stuy](https://en.wikipedia.org/wiki/Bedford%E2%80%93Stuyvesant,_Brooklyn) said it best:
"And if you don't know, now you know".

Ok, cool, so what did we learn from all this?  To me, the real amusing part was the relative
ages of the various bits of software involved in the making of this silly utility.  In chronological
order:

| Component                    | Year | Role played                                                 |
| ---------------------------- | ---- | ----------------------------------------------------------- |
| Linux Signals                | 1972 | Handle SIGWINCH to truncate lines and erase correctly       |
| Control Sequence Introducers | 1976 | Manipulate standard output beyond appending to it           |
| ZIP file format[^1]          | 1989 | Because that's what AWS chose in 2014                       |
| Python                       | 1989 | High-level and general-purpose                              |
| Meson                        | 2013 | Best build backend for compiled extension                   |
| Zig                          | 2016 | "programming language designed for making perfect software" |
| Ziggy Pydust[^2]             | 2023 | "Framework for building native Python extension in Zig"     |
| uv                           | 2024 | "extremely fast Python package installer and resolver"      |

If anything, this proves that, in the world of software, maybe you _can_ teach old dogs new tricks!
Obviously, all of this goes back to the
[Von Neuman architecture](https://en.wikipedia.org/wiki/Von_Neumann_architecture) from 1945
but that's true of every software project so I chose to leave it out.  The above selection
is trying to enumerate choices that are particularly salient to the tool being discussed.

[^1]: [Truncating](https://discuss.python.org/t/disable-shell-word-wrapping/4297/5) is one way to avoid line wraps but the [VT100](https://en.wikipedia.org/wiki/VT100) has escape sequences to control [auto wrap](https://www.vt100.net/docs/vt102-ug/chapter5.html#S5.5.2.8) (`"\N{escape}[?7l"`)
[^2]: "It's not the destination, it's the journey." ― Ralph Waldo Emerson
