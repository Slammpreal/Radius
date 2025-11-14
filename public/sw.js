importScripts("/vu/uv.bundle.js", "/vu/uv.config.js", "/marcs/scramjet.all.js");
importScripts(__uv$config.sw || "/vu/uv.sw.js");

const uv = new UVServiceWorker();

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const sj = new ScramjetServiceWorker();

// Enhanced fetch handling with retry logic and better error handling
self.addEventListener("fetch", function (event) {
    event.respondWith(
        (async () => {
            try {
                await sj.loadConfig();

                // Route to UV proxy
                if (event.request.url.startsWith(location.origin + __uv$config.prefix)) {
                    return await uv.fetch(event);
                }
                // Route to Scramjet proxy
                else if (sj.route(event)) {
                    return await sj.fetch(event);
                }
                // Pass through for non-proxy requests
                else {
                    return await fetch(event.request);
                }
            } catch (error) {
                console.error("Service worker fetch error:", error);

                // Retry logic for failed requests
                try {
                    return await fetch(event.request);
                } catch (retryError) {
                    // Return error response
                    return new Response("Proxy request failed", {
                        status: 500,
                        statusText: "Internal Server Error"
                    });
                }
            }
        })()
    );
});
