/* WebSocket text-frame benchmark: server CPU per received message, one build against another.
 * Server and client run in separate processes; the client is Node's built-in WebSocket.
 *
 *   node benchmarks/ws-text.mjs <dist-a> <dist-b> ...   compare builds (each dist holds uws.js + .node)
 *   node benchmarks/ws-text.mjs server <dist> <port>     internal
 *   node benchmarks/ws-text.mjs client <port> <kind> <size> <count>   internal
 */

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { once } from 'node:events';

const script = new URL(import.meta.url).pathname;
const [mode, ...args] = process.argv.slice(2);

const UNITS = { ascii: 'a', mixed: '{"name":"value","text":"hello 中"},', cjk: '中' };
const CASES = [[128, 200000], [4096, 50000], [65536, 5000]];
const RUNS = 3;

function payload(kind, size) {
  const unit = Buffer.from(UNITS[kind]);
  const buf = Buffer.alloc(size, 'a');
  for (let i = 0; i + unit.length <= size; i += unit.length) unit.copy(buf, i);
  return buf.toString();
}

if (mode === 'server') {
  const [dist, port] = args;
  const uWS = createRequire(import.meta.url)(resolve(dist, 'uws.js'));
  let n, t0, c0;
  uWS.App().ws('/*', {
    maxPayloadLength: 1 << 20,
    open: () => { n = 0; },
    message: (ws, message, isBinary) => {
      if (!isBinary) {
        if (n++ === 0) { t0 = process.hrtime.bigint(); c0 = process.cpuUsage(); }
        return;
      }
      /* A binary frame ends the run */
      const cpu = process.cpuUsage(c0);
      ws.send(JSON.stringify({ n, seconds: Number(process.hrtime.bigint() - t0) / 1e9, cpu: (cpu.user + cpu.system) / 1e6 }));
    },
  }).listen(+port, (token) => console.log(token ? 'ready' : 'listen failed'));
} else if (mode === 'client') {
  const [port, kind, size, count] = args;
  const text = payload(kind, +size);
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  await once(ws, 'open');
  for (let i = 0; i < +count; i++) {
    ws.send(text);
    while (ws.bufferedAmount > 4 << 20) await new Promise(setImmediate);
  }
  ws.send(new Uint8Array(1));
  const [event] = await once(ws, 'message');
  console.log(event.data);
  ws.close();
} else {
  const dists = [mode, ...args].filter(Boolean);
  if (!dists.length) throw new Error('usage: node benchmarks/ws-text.mjs <dist-a> <dist-b> ...');

  const run = (argv) => new Promise((ok, fail) => {
    const child = spawn(process.execPath, [script, ...argv], { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.on('exit', (code) => (code ? fail(new Error(`${argv[0]} exited ${code}`)) : ok(out.trim())));
  });
  const median = (xs) => xs.sort((a, b) => a - b)[xs.length >> 1];

  const results = {};
  for (const [i, dist] of dists.entries()) {
    const port = 9100 + i;
    const server = spawn(process.execPath, [script, 'server', dist, port], { stdio: ['ignore', 'pipe', 'inherit'] });
    const [line] = await once(server.stdout, 'data');
    if (!String(line).includes('ready')) throw new Error(`${dist}: ${line}`);

    for (const kind of Object.keys(UNITS)) {
      for (const [size, count] of CASES) {
        const samples = [];
        for (let r = 0; r < RUNS; r++) {
          const { n, seconds, cpu } = JSON.parse(await run(['client', port, kind, size, count]));
          if (n !== count) throw new Error(`${dist} ${kind}/${size}: server got ${n} of ${count}`);
          samples.push({ usPerMsg: (cpu / n) * 1e6, msgPerSec: n / seconds });
        }
        (results[`${kind}/${size}`] ??= []).push({
          usPerMsg: median(samples.map((s) => s.usPerMsg)),
          msgPerSec: median(samples.map((s) => s.msgPerSec)),
        });
      }
    }
    server.kill();
  }

  console.log(`server CPU µs per message (lower is better), median of ${RUNS}; msg/s is client-bound\n`);
  console.log(['case', ...dists.map((d) => `${d} µs`), ...dists.map((d) => `${d} msg/s`), dists.length === 2 ? 'Δ CPU' : ''].join('\t'));
  for (const [name, rows] of Object.entries(results)) {
    const delta = rows.length === 2 ? `${(((rows[1].usPerMsg - rows[0].usPerMsg) / rows[0].usPerMsg) * 100).toFixed(1)}%` : '';
    console.log([name, ...rows.map((r) => r.usPerMsg.toFixed(2)), ...rows.map((r) => r.msgPerSec.toFixed(0)), delta].join('\t'));
  }
}
