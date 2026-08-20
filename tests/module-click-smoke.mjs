const targets = await (await fetch("http://127.0.0.1:9223/json")).json();
const target = targets.find((item) => item.type === "page") ?? targets[0];
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let sequence = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  message.error ? reject(message.error) : resolve(message.result);
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: "http://localhost:3001/" });
await new Promise((resolve) => setTimeout(resolve, 2500));

const expression = `(async () => {
  const labels = ["Movimientos", "Gastos", "Presupuestos", "Metas de ahorro", "Reportes", "Cuentas"];
  const results = [];
  for (const label of labels) {
    const button = [...document.querySelectorAll("nav button")].find((item) => item.textContent.trim() === label);
    if (!button) {
      results.push({ label, error: "Botón no encontrado en " + location.href + ": " + document.body.innerText.slice(0, 80) });
      continue;
    }
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 180));
    results.push({
      label,
      heading: document.querySelector("main h1")?.textContent || "",
      error: document.body.innerText.includes("ModuleHeading is not defined") ? "ReferenceError" : "",
    });
  }
  return results;
})()`;
const evaluated = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
console.log(JSON.stringify(evaluated.result.value));
ws.close();
