if (!self.define) {
  let s,
    e = {};
  const i = (i, n) => (
    (i = new URL(i + ".js", n).href),
    e[i] ||
      new Promise((e) => {
        if ("document" in self) {
          const s = document.createElement("script");
          ((s.src = i), (s.onload = e), document.head.appendChild(s));
        } else ((s = i), importScripts(i), e());
      }).then(() => {
        let s = e[i];
        if (!s) throw new Error(`Module ${i} didn’t register its module`);
        return s;
      })
  );
  self.define = (n, a) => {
    const c =
      s ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (e[c]) return;
    let t = {};
    const r = (s) => i(s, c),
      o = { module: { uri: c }, exports: t, require: r };
    e[c] = Promise.all(n.map((s) => o[s] || r(s))).then((s) => (a(...s), t));
  };
}
define(["./workbox-4754cb34"], function (s) {
  "use strict";
  (importScripts(),
    self.skipWaiting(),
    s.clientsClaim(),
    s.precacheAndRoute(
      [
        {
          url: "/_next/app-build-manifest.json",
          revision: "01e07e5ef14ea7bcd76eea95c57505b4",
        },
        {
          url: "/_next/static/chunks/200-24f98d40ce5cfb1f.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/253-aed760025ec3b51b.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/260-38fdfa16badd6d4a.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/263-a9af5657dabb8497.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/265.0018248a90ca6f20.js",
          revision: "0018248a90ca6f20",
        },
        {
          url: "/_next/static/chunks/310-b4d95a86a21eb31e.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/346.6dcd2e1f18431029.js",
          revision: "6dcd2e1f18431029",
        },
        {
          url: "/_next/static/chunks/389.779fc04c940a4339.js",
          revision: "779fc04c940a4339",
        },
        {
          url: "/_next/static/chunks/424-126d2a2c308cd28f.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/473f56c0.aa26513191ee2da4.js",
          revision: "aa26513191ee2da4",
        },
        {
          url: "/_next/static/chunks/4bd1b696-4f7b42ec995cd7c3.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/634.fb654a3ab2db7bb3.js",
          revision: "fb654a3ab2db7bb3",
        },
        {
          url: "/_next/static/chunks/673-e4c27bcef299dfbe.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/675.d9dd2c2c85cccae4.js",
          revision: "d9dd2c2c85cccae4",
        },
        {
          url: "/_next/static/chunks/684-63ccb8a328c75fff.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/70646a03.4148b2668c31b5ce.js",
          revision: "4148b2668c31b5ce",
        },
        {
          url: "/_next/static/chunks/728.ab1cba80444a53e3.js",
          revision: "ab1cba80444a53e3",
        },
        {
          url: "/_next/static/chunks/744-281d79bebc82ebce.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/766-fd3911d0c084be25.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/77-dd2d5db471c5933b.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/7c09d4dc-a45c8031304089ab.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/801-13c565a0dca54b6d.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/816-e2c55ecac14e5a92.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/874-3f0ccce4bafb33a6.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/972.9ff8dabfe43da70d.js",
          revision: "9ff8dabfe43da70d",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-6d6330eacccefb54.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/app/api/lightning/config/route-abba6cdcc5889436.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/app/api/lightning/create/route-52c149eebe2afdc9.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/app/api/lightning/status/%5BinvoiceId%5D/route-677b80bb310b87da.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/app/api/lightning/summary/route-d4ea0fd9242cc1a1.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/app/api/lightning/webhook/%5BbridgeId%5D/route-09dadfdb35651fbb.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/app/api/price/route-dc5c810b18ebc9ba.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/app/blockexplorer/address/%5Baddress%5D/page-11b6e3e364cb90c7.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/app/blockexplorer/page-2ba41d58f55813f8.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/app/blockexplorer/tx/%5Bhash%5D/page-3ee770a39e44a0e8.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/app/configure/page-5d01f662ea1c9642.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/app/debug/page-b7d4be2f088d833e.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/app/exchange/page-ff81ecd3775201f4.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/app/layout-49acdef38e68d926.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/app/lightning/page-32a3c35bf2650289.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/app/page-2c7c121a82030946.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/e6909d18-190f5d2b622c58b9.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/framework-859199dea06580b0.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/main-2ed58b09aa1651c0.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/main-app-d01db1b9e32efafc.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/pages/_app-da15c11dea942c36.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/pages/_error-cc3f077a18ea1793.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-6b2a4970e7f215ef.js",
          revision: "hxCEou8siGErVOBN6sJT2",
        },
        {
          url: "/_next/static/css/a25074182b602e16.css",
          revision: "a25074182b602e16",
        },
        {
          url: "/_next/static/hxCEou8siGErVOBN6sJT2/_buildManifest.js",
          revision: "2af976dbd7796b8d759ed72c1308e04d",
        },
        {
          url: "/_next/static/hxCEou8siGErVOBN6sJT2/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        { url: "/_redirects", revision: "6a02faf7ea2a9584134ffe15779a0e44" },
        {
          url: "/blast-icon-color.svg",
          revision: "f455c22475a343be9fcd764de7e7147e",
        },
        {
          url: "/debug-icon.svg",
          revision: "25aadc709736507034d14ca7aabcd29d",
        },
        {
          url: "/debug-image.png",
          revision: "34c4ca2676dd59ff24d6338faa1af371",
        },
        {
          url: "/explorer-icon.svg",
          revision: "84507da0e8989bb5b7616a3f66d31f48",
        },
        {
          url: "/gradient-s.svg",
          revision: "c003f595a6d30b1b476115f64476e2cf",
        },
        { url: "/logo.ico", revision: "0359e607e29a3d3b08095d84a9d25c39" },
        { url: "/logo.svg", revision: "962a8546ade641ef7ad4e1b669f0548c" },
        { url: "/manifest.json", revision: "781788f3e2bc4b2b176b5d8c425d7475" },
        {
          url: "/rpc-version.png",
          revision: "cf97fd668cfa1221bec0210824978027",
        },
        {
          url: "/scaffold-config.png",
          revision: "1ebfc244c31732dc4273fe292bd07596",
        },
        {
          url: "/sn-symbol-gradient.png",
          revision: "908b60a4f6b92155b8ea38a009fa7081",
        },
        {
          url: "/volta-logo.png",
          revision: "015a3c981bce08f06cc26d4b9047ef3c",
        },
        { url: "/volta.png", revision: "55d3f3a269dc4e1440d3330cd73cfcf8" },
        {
          url: "/voyager-icon.svg",
          revision: "06663dd5ba2c49423225a8e3893b45fe",
        },
      ],
      { ignoreURLParametersMatching: [] },
    ),
    s.cleanupOutdatedCaches(),
    s.registerRoute(
      "/",
      new s.NetworkFirst({
        cacheName: "start-url",
        plugins: [
          {
            cacheWillUpdate: async ({
              request: s,
              response: e,
              event: i,
              state: n,
            }) =>
              e && "opaqueredirect" === e.type
                ? new Response(e.body, {
                    status: 200,
                    statusText: "OK",
                    headers: e.headers,
                  })
                : e,
          },
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new s.CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new s.StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new s.StaleWhileRevalidate({
        cacheName: "static-font-assets",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new s.StaleWhileRevalidate({
        cacheName: "static-image-assets",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new s.StaleWhileRevalidate({
        cacheName: "next-image",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new s.CacheFirst({
        cacheName: "static-audio-assets",
        plugins: [
          new s.RangeRequestsPlugin(),
          new s.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /\.(?:mp4)$/i,
      new s.CacheFirst({
        cacheName: "static-video-assets",
        plugins: [
          new s.RangeRequestsPlugin(),
          new s.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /\.(?:js)$/i,
      new s.StaleWhileRevalidate({
        cacheName: "static-js-assets",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /\.(?:css|less)$/i,
      new s.StaleWhileRevalidate({
        cacheName: "static-style-assets",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new s.StaleWhileRevalidate({
        cacheName: "next-data",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new s.NetworkFirst({
        cacheName: "static-data-assets",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      ({ url: s }) => {
        if (!(self.origin === s.origin)) return !1;
        const e = s.pathname;
        return !e.startsWith("/api/auth/") && !!e.startsWith("/api/");
      },
      new s.NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      ({ url: s }) => {
        if (!(self.origin === s.origin)) return !1;
        return !s.pathname.startsWith("/api/");
      },
      new s.NetworkFirst({
        cacheName: "others",
        networkTimeoutSeconds: 10,
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      ({ url: s }) => !(self.origin === s.origin),
      new s.NetworkFirst({
        cacheName: "cross-origin",
        networkTimeoutSeconds: 10,
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
        ],
      }),
      "GET",
    ));
});
