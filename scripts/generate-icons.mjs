/**
 * Draw the app icons from the Knoten mark.
 *
 * The PWA needs raster icons in several sizes and two shapes, and hand-made PNGs rot:
 * the day the mark changes, nobody remembers which of the six files were exported at
 * which padding. So they are generated from `app/icon.svg`, and this script is the
 * record of how. It drives the system Chromium over the DevTools protocol, exactly like
 * `scripts/screenshot.mjs`, so it needs no dependency and no browser download.
 *
 * Usage:
 *   node scripts/generate-icons.mjs
 *
 * The two shapes are not decoration:
 *   - "any"      — the mark on a paper ground, inset like a printed label. Used as-is by
 *                  the browser, so it has to look finished on its own.
 *   - "maskable" — the same ground bled to every edge with the mark at 55 % of the width,
 *                  because Android crops the icon to whatever shape the launcher uses and
 *                  only guarantees the inner circle survives.
 */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// The mark is wider than it is tall; dropping the empty bands above and below it before
// scaling is what keeps a square icon from being mostly margin.
const mark = readFileSync(join(root, "app", "icon.svg"), "utf8").replace(
  'viewBox="0 0 64 64"',
  'viewBox="4 11 56 42"',
);

/** Paper, the light canvas token. Icons do not follow the system theme. */
const GROUND = "#f6f3ee";

/** width = height, `scale` is the mark's share of that, `radius` in CSS pixels. */
const ICONS = [
  { file: "icon-192.png", size: 192, scale: 0.68, radius: 42 },
  { file: "icon-512.png", size: 512, scale: 0.68, radius: 112 },
  { file: "maskable-192.png", size: 192, scale: 0.55, radius: 0 },
  { file: "maskable-512.png", size: 512, scale: 0.55, radius: 0 },
  // iOS applies its own rounding and never renders transparency, so this one is a
  // square with the mark a little tighter than the browser icon.
  { file: "apple-touch-icon.png", size: 180, scale: 0.66, radius: 0 },
];

function page({ size, scale, radius }) {
  const inner = Math.round(size * scale);
  return `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:transparent}
    .icon{width:${size}px;height:${size}px;border-radius:${radius}px;background:${GROUND};
          display:flex;align-items:center;justify-content:center;overflow:hidden}
    .icon svg{width:${inner}px;height:${inner}px;display:block}
  </style><div class="icon">${mark}</div>`;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9633 + Math.floor(Math.random() * 300);
const profile = mkdtempSync(join(tmpdir(), "kk-icons-"));
const chrome = spawn(
  "chromium",
  [
    "--headless",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

async function endpoint() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      return (await res.json()).webSocketDebuggerUrl;
    } catch {
      await wait(250);
    }
  }
  throw new Error("chromium devtools did not come up");
}

const ws = new WebSocket(await endpoint());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));

let id = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
});
function send(method, params = {}, sessionId) {
  const messageId = ++id;
  return new Promise((resolve) => {
    pending.set(messageId, resolve);
    ws.send(JSON.stringify({ id: messageId, method, params, sessionId }));
  });
}

const { result: target } = await send("Target.createTarget", { url: "about:blank" });
const { result: attached } = await send("Target.attachToTarget", {
  targetId: target.targetId,
  flatten: true,
});
const session = attached.sessionId;
await send("Page.enable", {}, session);

const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

for (const icon of ICONS) {
  await send(
    "Emulation.setDeviceMetricsOverride",
    { width: icon.size, height: icon.size, deviceScaleFactor: 1, mobile: false },
    session,
  );
  await send(
    "Page.navigate",
    { url: `data:text/html;base64,${Buffer.from(page(icon)).toString("base64")}` },
    session,
  );
  await wait(400);
  const { result: shot } = await send(
    "Page.captureScreenshot",
    { format: "png", captureBeyondViewport: false },
    session,
  );
  writeFileSync(join(outDir, icon.file), Buffer.from(shot.data, "base64"));
  console.log(`public/icons/${icon.file} (${icon.size}x${icon.size})`);
}

ws.close();
chrome.kill();
process.exit(0);
