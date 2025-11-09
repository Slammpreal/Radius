import { defineConfig } from "astro/config";
import type { Plugin } from "vite";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import { viteStaticCopy } from "vite-plugin-static-copy";
import playformCompress from "@playform/compress";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { bareModulePath } from "@mercuryworkshop/bare-as-module3";

const viteWispServer = (): Plugin => {
    return {
        name: "vite-wisp-server",
        configureServer(server) {
            server.httpServer?.on("upgrade", (req, socket, head) => {
                req.url.startsWith("/wisp") || req.url.startsWith("/adblock")
                    ? wisp.routeRequest(req, socket, head)
                    : undefined;
            });
        }
    };
};

export default defineConfig({
    vite: {
        plugins: [
            tailwindcss(),
            viteWispServer(),
            viteStaticCopy({
                targets: [
                    { src: `${uvPath}/**/*`.replace(/\\/g, "/"), dest: "vu" },
                    { src: `${scramjetPath}/**/*`.replace(/\\/g, "/"), dest: "marcs" },
                    { src: `${baremuxPath}/**/*`.replace(/\\/g, "/"), dest: "erab" },
                    { src: `${epoxyPath}/**/*`.replace(/\\/g, "/"), dest: "epoxy" },
                    { src: `${libcurlPath}/**/*`.replace(/\\/g, "/"), dest: "libcurl" },
                    { src: `${bareModulePath}/**/*`.replace(/\\/g, "/"), dest: "baremod" }
                ]
            })
        ]
    },
    integrations: [
        icon(),
        playformCompress({
            CSS: false,
            HTML: true,
            Image: true,
            JavaScript: true,
            SVG: true
        })
    ],
    output: "server",
    adapter: node({
        mode: "standalone"
    })
});
