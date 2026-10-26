// Temporary probe: is requestAnimationFrame ticking in this headless page?
const PORT = 9222;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const res = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent("http://localhost:5173/")}`, { method: "PUT" });
const target = await res.json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 0;

const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id) {
    pending.get(msg.id)?.(msg);
    pending.delete(msg.id);
  }
};

await new Promise((r) => (ws.onopen = r));
await send("Runtime.enable");
await sleep(3000);

const evaluate = async (expression) => {
  const out = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return out.result?.result?.value;
};

console.log("visibility:", await evaluate("document.visibilityState + ' / hidden=' + document.hidden"));
console.log("fps probe:", await evaluate(`new Promise((resolve) => {
  let frames = 0;
  const start = performance.now();
  function tick() {
    frames++;
    if (performance.now() - start < 500) requestAnimationFrame(tick);
    else resolve(frames);
  }
  requestAnimationFrame(tick);
})`));

ws.close();
