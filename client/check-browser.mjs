// Temporary runtime check driven through the Chrome DevTools Protocol.
import crypto from "node:crypto";

const PORT = 9222;
const PAGE_URL = "http://localhost:5173/";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" });
  const target = await res.json();

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const consoleErrors = [];
  const exceptions = [];
  let loadResolve;
  const loaded = new Promise((r) => (loadResolve = r));

  let nextId = 0;
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++nextId;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id) {
      pending.get(msg.id)?.(msg);
      pending.delete(msg.id);
      return;
    }
    if (msg.method === "Page.loadEventFired") loadResolve();
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(" "));
    }
    if (msg.method === "Runtime.exceptionThrown") {
      exceptions.push(msg.params.exceptionDetails.text + " " + (msg.params.exceptionDetails.exception?.description ?? ""));
    }
    if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
      consoleErrors.push(msg.params.entry.text);
    }
  };

  await new Promise((r) => (ws.onopen = r));
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Log.enable");
  await send("Runtime.addBinding", { name: "__noop" }).catch(() => {});
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      window.__pageErrors = [];
      window.addEventListener('error', (e) => window.__pageErrors.push(String(e.message)));
      window.addEventListener('unhandledrejection', (e) => window.__pageErrors.push(String(e.reason)));
    `,
  });

  await send("Page.navigate", { url: PAGE_URL });
  await Promise.race([loaded, sleep(8000)]);
  await sleep(2500);

  const evaluate = async (expression) => {
    const out = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (out.result?.exceptionDetails) throw new Error(JSON.stringify(out.result.exceptionDetails));
    return out.result?.result?.value;
  };

  const info = await evaluate(`(() => {
    const canvas = document.querySelector('canvas');
    const game = document.querySelector('.game');
    return {
      title: document.title,
      canvas: canvas ? {
        buffer: canvas.width + 'x' + canvas.height,
        css: canvas.clientWidth + 'x' + canvas.clientHeight,
      } : null,
      gameSize: game ? game.clientWidth + 'x' + game.clientHeight : null,
      viewport: window.innerWidth + 'x' + window.innerHeight,
      header: document.querySelector('.brand h1')?.textContent ?? null,
      mission: document.querySelector('.mission-card h2')?.textContent ?? null,
      sceneLabel: document.querySelector('.scene-label')?.textContent?.trim() ?? null,
      rootChildren: document.getElementById('root')?.children.length ?? -1,
      pageErrors: window.__pageErrors ?? null,
    };
  })()`);

  console.log("page state:", JSON.stringify(info, null, 2));

  // Probe: does a synthetic keypress actually reach window listeners?
  await evaluate("window.__keys = []; window.addEventListener('keydown', (e) => window.__keys.push(e.code)); 'ok'");

  const r3fProbe = await evaluate("(() => { const c = document.querySelector('canvas'); return { own: Object.keys(c).filter(k => k.startsWith('__')), hasR3f: !!c.__r3f }; })()");
  console.log("canvas internals:", JSON.stringify(r3fProbe));

  const shot1 = await send("Page.captureScreenshot", { format: "png" });
  const hash1 = crypto.createHash("sha1").update(shot1.result.data).digest("hex");

  // Hold W for ~1s, the same event code the game listens for.
  await send("Input.dispatchKeyEvent", { type: "keyDown", code: "KeyW", key: "w", windowsVirtualKeyCode: 87, nativeVirtualKeyCode: 87 });
  await sleep(1000);
  await send("Input.dispatchKeyEvent", { type: "keyUp", code: "KeyW", key: "w", windowsVirtualKeyCode: 87, nativeVirtualKeyCode: 87 });
  await sleep(700);

  const shot2 = await send("Page.captureScreenshot", { format: "png" });
  const hash2 = crypto.createHash("sha1").update(shot2.result.data).digest("hex");

  await sleep(300);
  const afterErrors = await evaluate("window.__pageErrors");

  const keys = await evaluate("window.__keys");
  console.log("keydown codes seen by page:", keys);
  console.log("screenshot bytes:", shot1.result.data.length, "->", shot2.result.data.length);
  console.log("render before keypress:", hash1.slice(0, 12), "| after W:", hash2.slice(0, 12));
  console.log("scene changed after pressing W:", hash1 !== hash2);
  console.log("page errors:", afterErrors);
  console.log("console errors:", consoleErrors);
  console.log("exceptions:", exceptions);

  ws.close();
}

main().catch((err) => {
  console.error("CHECK FAILED:", err);
  process.exit(1);
});
