---
layout: post
title:  "What's a Veg-O-Matic?"
date:   2025-10-16 14:01:51 -0500
comments: false
---
## Or How do you Slice and Dice Data?

A former employer of mine rolled out a graphical tool years ago which
let us interrogate tabular data sets with minimal coding.  Think 
Excel PivotTable except better.  You could drag column headers and drop
them into the left margin to summarize (group) data by the corresponding
values (or dimension).  There was a filter dialog who let you compose
complex [Boolean expressions](https://en.wikipedia.org/wiki/Boolean_expression)
with a few mouse clicks.  That was _so_ helpful and I miss it to this day.

After I left, I started looking around for a substitute and came across
[PivotTable.js](https://pivottable.js.org/).  I liked it but was immediately
[nerd sniped](https://xkcd.com/356/) by 
[this comment](https://github.com/nicolaskruchten/pivottable/wiki/Frequently-Asked-Questions#input-data-size).
I looked at the code and thought that implementing 
[OLAP](https://en.wikipedia.org/wiki/Online_analytical_processing) in JavaScript
probably contributed to data size limitations.  Around the same time, I noticed
that Chrome, like many industrial applications, embedded [SQLite](https://sqlite.org).
Not only that, it even [exposed it to JavaScript](https://www.w3.org/TR/webdatabase/).
Yes, the W3C page already sported the deprecation warning but I was young and naive
so I worked my through the quirky Web SQL API and did a thing.

[React](https://react.dev) and [Angular](https://angular.dev) were the leading Web UI
frameworks at the time but frameworks just irked me and I wanted something more
lightweight so I reached for `<gasp>`[Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)`</gasp>`!
[PivotTable.js](https://github.com/nicolaskruchten/pivottable) also relied on
[jQuery](https://jquery.com/) and I wouldn't stand for that so I learned
the [HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API).
And that crazy gizmo kinda worked back in 2019!

[jburgy/data-grid](https://github.com/jburgy/data-grid) sat there, gathering dust
(and [bit rot](https://en.wikipedia.org/wiki/Software_rot)) until I created an
issue to [Replace Web SQL](https://github.com/jburgy/data-grid/issues/1) on the
Spring Equinox.  You see, Chrome finally did
[deprecate and remove Web SQL](https://developer.chrome.com/blog/deprecating-web-sql)
as ~~promised~~ threatened.  And just the little spark that set `data-grid` apart
was estinguished.  However, a great many things happened on the Web during that time.
Most importantly, [WebAssembly](https://webassembly.org/) democratized embedding
non-web software in web browsers.  Much to their credit, the SQLite maintainers decided
to offer an official [WASM port](https://sqlite.org/wasm) of their awesome product.

[`@sqlite.org/sqlite-wasm`](https://www.npmjs.com/package/@sqlite.org/sqlite-wasm)
brought `data-grid` from the brink.  I should also say that its 
[Promise-based Wrapper](https://sqlite.org/wasm/doc/trunk/api-worker1.md#promiser)
is much less quirky that the old Web SQL API.  That first step was the easy part.
The heavy lift comes from the fact that I insist on embedding a demo in this blog
post.  For better or worse, I really liked how the most recent iteration of the
[What, python, slow?]({% post_url 2022-03-12-what-python-slow %}) post turned out:
using [`JupyterLite`](https://jupyterlite.readthedocs.io/).  Had I known how much
additional worked it would have created, I might have chosen a different approach.
(Nah, who am I kidding, since when do I do these because they're easy)

2019 `data-grid` also came as an incredibly clunky custom
[Jupyter Widget](https://ipywidgets.readthedocs.io/en/stable/examples/Widget%20Custom.html).
You need to remember that 
[es6 modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
were not widely supported back then so you still needed to contend with nonsense
like AMD and UMD.  [`anywidget`](https://anywidget.dev/) appeared in 2024 precisely
to make custom Jupyter Widgets easy (or at least easier if you don't need to worry
about bundling dependencies).

Fortunately, many of the pieces were already in place.  Unfortunately, previous demos
on this blog pale in comparison with the complexity of this one, particularly when it
comes to [`import`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)
depth.  [gzuidhof/coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker), who
let me circumvent GitHub's persistent lack of
[custom headers](https://github.com/orgs/community/discussions/54257) many times before,
just [wouldn't work this time](https://stackoverflow.com/questions/79790645/active-service-worker-logging-but-not-intercepting-requests).
I asked Claude and Copilot for help but they came up empty so I threw in the towel and
used a [Cloudflare Worker](https://github.com/jburgy/ogoz).  Its name is a nod to my
ancestors since my grandmother grew up on a farm that is now at the bottom of the lake
which surrounds [l'Île d'Ogoz](https://en.wikipedia.org/wiki/%C3%8Ele_d%27Ogoz).

Lastly, I needed to figure out how to mount the
[Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
in a [pyodide kernel](https://jupyterlite-pyodide-kernel.readthedocs.io/en/latest/).
I had never heard of [pyodide_js](https://pyodide.org/en/stable/usage/api/js-api.html#module-pyodide)
until today.  The amount of back-and-forth between python and JavaScript reminds me of
Robert Downey Jr's character in "Tropic Thunder" ("I'm a dude playing a dude disguised as another dude").

The notebook below runs entirely in your browser.  After installing
[anywidget](https://pypi.org/project/anywidget/), it fetches a public dataset on traffic
violations, massages it with [`pandas`](https://pandas.pydata.org/docs/index.html) before
saving it to a SQLite file in OPFS.  The widget uses
[`@slite.org/sqlite-wasm`](https://sqlite.org/wasm) to summarize that data.

<iframe 
    src="https://ogoz.jburgy.workers.dev/jupyter/notebooks/index.html?path=data_grid.ipynb"
    width="100%"
    height="900px"
    allow="cross-origin-isolated"
></iframe>

And if you read that far, first of all congratulations!  I realize you might still like an answer
to the question posed in this article's title.  Besides sounding like a
[Wallace & Gromit](https://en.wikipedia.org/wiki/Wallace_%26_Gromit) invention,
The [Veg-O-Matic](https://en.wikipedia.org/wiki/Veg-O-Matic) is the appliance that coined the
"It slices! It dices!" catchphrase.  I thought it was relevant since we're discussing a tool
to slice and dice data.  Womp womp.
