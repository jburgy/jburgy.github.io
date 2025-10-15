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
    const { request } = event;

    if (request.cache === "only-if-cached" && request.mode !== "same-origin") {
        return;
    } else if (request.url.endsWith("/api/service-worker-heartbeat")) {
        event.respondWith(new Response("ok"));
        return;
    }

    event.respondWith(
        fetch(request).then(
            (response) => pattern.test(response.url)
                ? response.blob().then((blob) => {
                    const headers = new Headers(response.headers);
                    headers.set("Cross-Origin-Embedder-Policy", "require-corp");
                    headers.set("Cross-Origin-Opener-Policy", "same-origin");

                    console.log("sw.js modifying headers for", response.url);
                    return new Response(blob, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: headers,
                    });
                }, console.error)
                : response
            , console.error)
    );
});