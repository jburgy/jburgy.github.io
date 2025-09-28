---
layout: post
title:  "What is vibe coding?"
date:   2025-09-27 10:09:18 -0500
---

## I put machine learning in your machine learning

First a disclaimer: I am a bit of an AI skeptic.  Not a luddite, not quite.  I do see
(the current iteration of) AI as impressive and impactful.  On the other hand, I do not
subscribe to the hype that AGI is just around the corner.  With that out of the way, let us try
and have fun with it all the same.

After several semi-successful attempts at coaxing answers to brain teasers out of
[ChatGPT](https://chatgpt.com/) and [DeepSeek](https://www.deepseek.com/) (and being
pleasantly surprised that it explained its solution to $\int_0^\infty \frac{\cos x}{1 + x^2} dx$
rather well), I thought of a project that [Copilot](https://copilot.microsoft.com/)
could probably help with.  And help it did!  My initial prompt was

> I want to build a web page in html5 and vanilla es6 modules that renders user facing webcam in a `<media>` tag so I can practice adding effects

I realized later that I really meant `<video>` but that didn't matter, Copilot created
a folder, named it `webcam-demo`, then created two files named `index.html` and
`main.js`.  And just like that, I could open the first file in a browser, grant it
video permissions, and see my face in a rectangle.  I had read just enough of
[this tutorial](https://web.dev/articles/getusermedia-intro) to understand that the
generated code followed modern practices.  I continued with

> I would like you to add a button. Upon clicking it a pair of pixelated sunglasses drops from the top of the `<video>` box and lands on the subject's nose.

Copilot outlined its plan then applied changes in-place.  The pixelated sunglasses didn't 
look anything like I had in mind (more on that later) and the "dropping" animation
landed them arbitrarily ⅔ of the way down.  I tried describing the shape I wanted for the
sunglasses several times in vain.  That's one of the cases where I jumped in
and edited the code by hand.  Then came the _real_ suprise:

> Do not estimate nose position. Use face detection so the sunglasses line up with the subject's nose. Track that position as it changes

And that was enough for Copilot to pull in [`face-api.js`](https://justadudewhohacks.github.io/face-api.js/docs/index.html)!
I knew enough to understand that I was never going to train a bespoke model for
such a standard task but had no idea how easy it would be to grab one off-the-shelf.
Twenty minutes in, I was essentially done.  The rest was asking Copilot to fix some
URLs that returned 404 (bit surprised it gave broken links initially if it "knew"
how to fix) and reordering some functions to make [ESLint](https://eslint.org)
less angry.  I cleaned some other stylistic choices I didn't like (e.g. passing nose position 
as a parameter to `drawTrackedSunglasses` instead of mutating a module-scoped variable,
using `.forEach` in `drawSunglasses` instead of nested `for` loops) but that was very
minor.  I even agreed with function names and their operations.

This little experiment is a far cry from what's happening on [Simon Willison's Weblog](https://simonwillison.net/) 
but ["that's _my_ story and I'm sticking to it"](https://en.wikipedia.org/wiki/That%27s_My_Story_(song)).
As luck would have it, I recently grokked how to 
[publish to GitHub pages with GitHub pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow)
so I can let you try this silly little "app" for yourself:

{::nomarkdown}
<button id="drop-btn">Drop Sunglasses</button>
<br>
<div style="position: relative; display: inline-block;;">
<video id="webcam" autoplay playsinline disablepictureinpicture style="display: block;"></video>
<canvas id="sunglasses-canvas" style="position: absolute; left: 0; top: 0; pointer-events: none;"></canvas>
</div>
<script type="module" src="https://bur.gy/blog/thug-life.js"></script>
{:/nomarkdown}
