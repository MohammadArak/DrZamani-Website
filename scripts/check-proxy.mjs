/** Exercise real Vite routing against a disposable loopback API; no external service needed. */
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createServer, preview } from 'vite';

const backend = http.createServer((request, response) => {
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify({ fixtureRoute: request.url }));
});
const originalTarget = process.env.VITE_API_PROXY_TARGET;
let dev;
let built;
try {
  backend.listen(0, '127.0.0.1');
  await once(backend, 'listening');
  process.env.VITE_API_PROXY_TARGET = `http://127.0.0.1:${backend.address().port}`;
  dev = await createServer({ server: { host: '127.0.0.1', port: 0, open: false }, logLevel: 'error' });
  await dev.listen();
  built = await preview({ preview: { host: '127.0.0.1', port: 0, open: false }, logLevel: 'error' });
  const request = (port, path) => fetch(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(10000) });
  for (const port of [dev.httpServer.address().port, built.httpServer.address().port]) {
    for (const path of ['/api/v1/audit-probe', '/media/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp', '/articles/audit-probe/', '/services/audit-probe/']) {
      const response = await request(port, path);
      assert.equal(response.status, 200);
      assert.equal((await response.json()).fixtureRoute, path);
    }
  }
  const source = await request(dev.httpServer.address().port, '/api/app/site_content_defaults.json?import');
  assert.equal(source.status, 200);
  const module = await source.text();
  assert.match(module, /export default/);
  assert.doesNotMatch(module, /fixtureRoute/);
  const serviceModule = await request(dev.httpServer.address().port, '/src/services/siteContentApi.ts');
  assert.equal(serviceModule.status, 200);
  assert.doesNotMatch(await serviceModule.text(), /fixtureRoute/);
  console.log('PASS: dev source JSON and service modules transform; API/media/article/service routes proxy in dev and preview.');
} finally {
  if (originalTarget === undefined) delete process.env.VITE_API_PROXY_TARGET;
  else process.env.VITE_API_PROXY_TARGET = originalTarget;
  if (dev) await dev.close();
  if (built) await new Promise((resolve, reject) => built.httpServer.close(error => error ? reject(error) : resolve()));
  await new Promise(resolve => backend.close(resolve));
}
