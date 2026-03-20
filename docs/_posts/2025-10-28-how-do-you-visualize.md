---
layout: post
title:  "How do you visualize data?"
date:   2025-10-28 13:52:24 -0500
---

We live in an era with "data is king" and that's great.  Unfortunately, data is hard
to interpret.  [Edward Tufte](https://en.wikipedia.org/wiki/Edward_Tufte) has written
phenomenal books on "The Visual Display of Quantitative Information".  In them, he
coined the term "data-ink ratio" and introduced other best practices.

That's all well and good but how are mere mortals supposed to apply these theories
on the web?  As with most things web, we are faced with an overwhelming
[paradox of choice](https://en.wikipedia.org/wiki/The_Paradox_of_Choice).  Type
[dashboard framework](https://letmegooglethat.com/?q=dashboard+framework) in your favorite
search engine if you don't believe me.

I have tried many of these "build dashboards in 10 easy steps" tutorials.  Some are
really great.  The opiniated ones frustrate you as soon as you try swimming outside
the lane they picked for you.  In my experience, the more mature ones are still
implemented in JavaScript or [TypeScript](https://www.typescriptlang.org/) which
makes data scientists recoil in horror.

[D3](https://d3js.org/) is incredibly powerful but its API is much too vast for
my [Grug brain](https://grugbrain.dev/).  [dc.js](https://dc-js.github.io/dc.js/)
is slightly less intimidating, yet retains many of D3's cool features (like
[Scalable Vector Graphics](https://developer.mozilla.org/en-US/docs/Web/SVG) and
transitions).  I wondered whether [PyScript](https://pyscript.net/) was flexible
enough to support the [dc.js](https://dc-js.github.io/dc.js/).  Turns out, it was:

<iframe 
    src="https://examples.pyscriptapps.com/dc-js-dimensional-charting-library/latest/"
    width="100%"
    height="1337.5px"
    allow="cross-origin-isolated"
></iframe>

No discussion on data visualization is complete without a mention of 
[Hans Rosling](https://en.wikipedia.org/wiki/Hans_Rosling)'s excellent
2006 TED Talk:

<div style="max-width:100%">
    <div style="position:relative;height:0;padding-bottom:56.25%">
        <iframe
            src="https://embed.ted.com/talks/hans_rosling_the_best_stats_you_ve_ever_seen"
            width="100%"
            height="576px"
            title="The best stats you've ever seen"
            style="position:absolute;left:0;top:0;width:100%;height:100%"
            frameborder="0"
            scrolling="no"
            allowfullscreen
            onload="window.parent.postMessage('iframeLoaded', 'https://embed.ted.com')"
        ></iframe>
    </div>
</div>