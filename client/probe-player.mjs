// Temporary probe: read the live player position while a key is held.
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
await sleep(3500);

const evaluate = async (expression) => {
  const out = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (out.result?.exceptionDetails) throw new Error(JSON.stringify(out.result.exceptionDetails));
  return out.result?.result?.value;
};

const pos = () =>
  evaluate(`(() => {
    const p = window.__survivexPlayer;
    return p ? { x: +p.position.x.toFixed(3), y: +p.position.y.toFixed(3), z: +p.position.z.toFixed(3), rotY: +p.rotation.y.toFixed(3) } : null;
  })()`);

console.log("player ref exposed:", (await pos()) !== null);
console.log("position at rest:", await pos());

await send("Input.dispatchKeyEvent", { type: "keyDown", code: "KeyW", key: "w", windowsVirtualKeyCode: 87, nativeVirtualKeyCode: 87 });
await sleep(300);
console.log("keys during hold:", await evaluate("Object.keys(window.__survivexKeys ?? {})"));
console.log("position while W held:", await pos());
await sleep(1200);
console.log("position after holding W:", await pos());

await send("Input.dispatchKeyEvent", { type: "keyUp", code: "KeyW", key: "w", windowsVirtualKeyCode: 87, nativeVirtualKeyCode: 87 });
await sleep(200);

await send("Input.dispatchKeyEvent", { type: "keyDown", code: "KeyA", key: "a", windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65 });
await sleep(600);
await send("Input.dispatchKeyEvent", { type: "keyUp", code: "KeyA", key: "a", windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65 });
console.log("position after strafing left:", await pos());

ws.close();
