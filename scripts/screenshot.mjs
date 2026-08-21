/**
 * Screenshot a running dev server, optionally signed in, at a given viewport.
 *
 * "Nothing is done until it works at 375 px" only means something if it can be checked,
 * and layout problems are invisible from the source. This drives the system Chromium over
 * the DevTools protocol using Node's global WebSocket, so it needs no dependency and no
 * browser download.
 *
 * Usage:
 *   node scripts/screenshot.mjs <url> <out.png> [width] [height] [light|dark] [cookie]
 *
 * Example, a signed-in page at phone width:
 *   node scripts/screenshot.mjs http://localhost:3000/fixkosten shot.png 375 820 light \
 *     "kk_session=$(node scripts/dev-session.mjs)"
 *
 * Set MEASURE to a JS expression to print a value from the page as well — useful for
 * asserting that nothing overflows:
 *   MEASURE='document.documentElement.scrollWidth' node scripts/screenshot.mjs ...
 */
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [url, out, width = "1280", height = "900", scheme = "light", cookie = ""] =
  process.argv.slice(2);

const port = 9333 + Math.floor(Math.random() * 300);
const profile = mkdtempSync(join(tmpdir(), "kk-chrome-"));
const chrome = spawn(
  "chromium",
  [
    "--headless",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--blink-settings=preferredColorScheme=${scheme === "dark" ? 0 : 1}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
function send(method, params = {}, sessionId) {
  const msgId = ++id;
  return new Promise((resolve) => {
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params, sessionId }));
  });
}

const { result: target } = await send("Target.createTarget", { url: "about:blank" });
const { result: attached } = await send("Target.attachToTarget", {
  targetId: target.targetId,
  flatten: true,
});
const s = attached.sessionId;

await send("Page.enable", {}, s);
await send("Network.enable", {}, s);
await send(
  "Emulation.setDeviceMetricsOverride",
  {
    width: Number(width),
    height: Number(height),
    deviceScaleFactor: 2,
    mobile: Number(width) < 700,
  },
  s,
);
if (cookie) {
  const [name, ...rest] = cookie.split("=");
  await send(
    "Network.setCookie",
    {
      name,
      value: rest.join("="),
      domain: "localhost",
      path: "/",
    },
    s,
  );
}

await send("Page.navigate", { url }, s);
await wait(2500);
if (process.env.MEASURE) {
  const { result } = await send(
    "Runtime.evaluate",
    {
      expression: process.env.MEASURE,
      returnByValue: true,
    },
    s,
  );
  console.log(JSON.stringify(result.result?.value, null, 1));
}

const { result: shot } = await send("Page.captureScreenshot", { format: "png" }, s);
writeFileSync(out, Buffer.from(shot.data, "base64"));
console.log(`${out} (${width}x${height}, ${scheme})`);

ws.close();
chrome.kill();
process.exit(0);
