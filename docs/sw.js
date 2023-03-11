self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
    if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
        return;
    }

    const suffixes = [
        "what-forth-again.html",
        "what-do-you-mean-homoiconic.html",
        "4th.worker.js",
        "lisp.worker.js",
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