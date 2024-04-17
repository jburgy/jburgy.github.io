self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
    if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
        return;
    }

    const suffixes = [
        "what-forth-again.html",
        "what-do-you-mean-homoiconic.html",
        "put-it-in-a-brandy-snifter.html",
        "tail-recursion.html",
        "4th.mjs",
        "4th.worker.mjs",
        "5th.mjs",
        "5th.worker.mjs",
        "lisp.worker.js",
        "TinyBasic.worker.js",
    ];
    event.respondWith(
        fetch(event.request).then(
            (response) => {
                if (!suffixes.some(suffix => response.url.endsWith(suffix)))
                    return response;

                const newHeaders = new Headers(response.headers);
                newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
                newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: newHeaders,
                });
            }, console.error)
    );
});