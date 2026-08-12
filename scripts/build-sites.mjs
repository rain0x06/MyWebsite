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
  ["/js/project-previews.js", "js/project-previews.js", "text/javascript; charset=utf-8", "text"],
  ["/js/redeye-globe.js", "js/redeye-globe.js", "text/javascript; charset=utf-8", "text"],
  ["/assets/rain-pfp.png", "assets/rain-pfp.png", "image/png", "base64"],
  ["/assets/og.png", "assets/og.png", "image/png", "base64"],
  ["/assets/driveassistant-ui.png", "assets/driveassistant-ui.png", "image/png", "base64"],
  ["/assets/ff-tools-splash.png", "assets/ff-tools-splash.png", "image/png", "base64"],
  ["/assets/models/redeye-aircraft.glb", "assets/models/redeye-aircraft.glb", "model/gltf-binary", "base64"],
  ["/assets/icons/c.svg", "assets/icons/c.svg", "image/svg+xml", "base64"],
  ["/assets/icons/cplusplus.svg", "assets/icons/cplusplus.svg", "image/svg+xml", "base64"],
  ["/assets/icons/csharp.svg", "assets/icons/csharp.svg", "image/svg+xml", "base64"],
  ["/assets/icons/python.svg", "assets/icons/python.svg", "image/svg+xml", "base64"],
  ["/assets/icons/javascript.svg", "assets/icons/javascript.svg", "image/svg+xml", "base64"],
  ["/assets/icons/windows.svg", "assets/icons/windows.svg", "image/svg+xml", "base64"],
  ["/assets/icons/apple.svg", "assets/icons/apple.svg", "image/svg+xml", "base64"],
  ["/assets/icons/linux.svg", "assets/icons/linux.svg", "image/svg+xml", "base64"],
  ["/assets/icons/html5.svg", "assets/icons/html5.svg", "image/svg+xml", "base64"],
  ["/assets/icons/plane.svg", "assets/icons/plane.svg", "image/svg+xml", "base64"],
  ["/assets/icons/hard-drive-download.svg", "assets/icons/hard-drive-download.svg", "image/svg+xml", "base64"],
  ["/assets/icons/bot.svg", "assets/icons/bot.svg", "image/svg+xml", "base64"],
  ["/assets/icons/gamepad-2.svg", "assets/icons/gamepad-2.svg", "image/svg+xml", "base64"],
  ["/assets/icons/ida.png", "assets/icons/ida.png", "image/png", "base64"],
  ["/assets/icons/x64dbg.ico", "assets/icons/x64dbg.ico", "image/x-icon", "base64"],
  ["/assets/icons/vscode.svg", "assets/icons/vscode.svg", "image/svg+xml", "base64"],
  ["/assets/icons/git.svg", "assets/icons/git.svg", "image/svg+xml", "base64"],
  ["/assets/icons/hxd.png", "assets/icons/hxd.png", "image/png", "base64"],
  ["/assets/icons/codex.png", "assets/icons/codex.png", "image/png", "base64"],
  ["/assets/icons/cheat-engine.ico", "assets/icons/cheat-engine.ico", "image/x-icon", "base64"],
  ["/assets/icons/mail.svg", "assets/icons/mail.svg", "image/svg+xml", "base64"],
  ["/assets/icons/discord.svg", "assets/icons/discord.svg", "image/svg+xml", "base64"],
  ["/assets/icons/github-white.svg", "assets/icons/github-white.svg", "image/svg+xml", "base64"],
  ["/assets/icons/x-white.svg", "assets/icons/x-white.svg", "image/svg+xml", "base64"],
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
