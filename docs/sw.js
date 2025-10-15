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

/**
 * Add Cross-Origin Isolation headers if necessary.
 * @param {Request} request
 * @param {Response} response
 */
async function fetchWithHeaders(request) {
    if (request.url.endsWith("/api/service-worker-heartbeat")) {
        return new Response("ok");
    }

    const response = await fetch(request);
    if (!pattern.test(request.url)) {
        return response;
    }

    const headers = new Headers(response.headers);
    headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    console.log("sw.js modified headers for", response.url);

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers,
    });
}

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.cache === "only-if-cached" && request.mode !== "same-origin") {
        return;
    }
    event.respondWith(fetchWithHeaders(request));
});