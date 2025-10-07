const pattern = new RegExp([
    "4th.mjs$",
    "5th.mjs$",
    "6th.mjs$",
    "jupyter",
    "lisp.worker.js$",
    "put-it-in-a-brandy-snifter.html$",
    "sqlite3-opfs-async-proxy-[^.]+.js$",
    "sqlite3-worker1-bundler-friendly-[^.]+.js$",
    "tail-recursion.html$",
    "TinyBasic.worker.js$",
    "what-do-you-mean-homoiconic.html$",
    "what-forth-again.html$",
    "why-not-zig.html$",
    "widget.mjs$",
].join("|"));

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
    if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
        return;
    }

    event.respondWith(
        fetch(event.request).then(
            (response) => {
                if (!pattern.test(response.url))
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