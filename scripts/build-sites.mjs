import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "dist", "server", "index.js");
const assetSpecs = [
  ["/", "index.html", "text/html; charset=utf-8", "text"],
  ["/index.html", "index.html", "text/html; charset=utf-8", "text"],
  ["/styles.css", "styles.css", "text/css; charset=utf-8", "text"],
  ["/js/main.js", "js/main.js", "text/javascript; charset=utf-8", "text"],
  ["/assets/rain-pfp.png", "assets/rain-pfp.png", "image/png", "base64"],
  ["/assets/og.png", "assets/og.png", "image/png", "base64"],
];

const assets = assetSpecs.map(([url, file, type, encoding]) => {
  const source = readFileSync(join(root, file));
  const body = encoding === "base64" ? source.toString("base64") : source.toString("utf8");
  return [url, { type, encoding, body }];
});

const worker = `const assets = new Map(${JSON.stringify(assets)});

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export default {
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
    }

    const url = new URL(request.url);
    const asset = assets.get(decodeURIComponent(url.pathname));
    if (!asset) return new Response("Not found", { status: 404 });

    const headers = new Headers({
      "content-type": asset.type,
      "cache-control": asset.type.startsWith("text/html") ? "no-cache" : "public, max-age=3600",
      "x-content-type-options": "nosniff",
    });

    if (request.method === "HEAD") return new Response(null, { status: 200, headers });
    const body = asset.encoding === "base64" ? decodeBase64(asset.body) : asset.body;
    return new Response(body, { status: 200, headers });
  },
};
`;

rmSync(join(root, "dist"), { recursive: true, force: true });
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, worker);
console.log(`Built ${output}`);
