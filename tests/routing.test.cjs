const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Run the actual TS modules without adding a test runner/dependency to the app.
function load(file, imports = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(
    (id) => imports[id] ?? require(id), module, module.exports,
  );
  return module.exports;
}

const origin = [118.96, 32.15];
const destination = [118.97, 32.16];
const valid = {
  status: '1', infocode: '10000', route: { paths: [{ distance: '1500', duration: '1100',
    steps: [{ instruction: '向北步行', distance: '1500', polyline: '118.96,32.15;118.96,32.16;118.97,32.16' }],
  }] },
};

async function scenario(run) {
  const env = { primary: process.env.AMAP_WEB_SERVICE_KEY, fallback: process.env.AMAP_KEY };
  const originalFetch = global.fetch;
  try {
    delete process.env.AMAP_WEB_SERVICE_KEY;
    process.env.AMAP_KEY = 'test-fallback-not-a-real-key';
    const amap = load('lib/amap.ts');
    await run(amap);
  } finally {
    global.fetch = originalFetch;
    if (env.primary === undefined) delete process.env.AMAP_WEB_SERVICE_KEY;
    else process.env.AMAP_WEB_SERVICE_KEY = env.primary;
    if (env.fallback === undefined) delete process.env.AMAP_KEY;
    else process.env.AMAP_KEY = env.fallback;
  }
}

function response(payload) { return new Response(JSON.stringify(payload)); }

test('missing key gives actionable configuration failure without fetch', () => scenario(async (amap) => {
  delete process.env.AMAP_KEY;
  global.fetch = () => assert.fail('must not request provider');
  await assert.rejects(amap.planWalkingSegment(origin, destination), { code: 'ROUTING_NOT_CONFIGURED', retryable: false });
}));

test('platform mismatch is not retried or converted into approx', () => scenario(async (amap) => {
  let calls = 0;
  global.fetch = async () => { calls++; return response({ status: '0', infocode: '10009', info: 'USERKEY_PLAT_NOMATCH' }); };
  await assert.rejects(amap.planWalkingSegment(origin, destination), (error) => {
    assert.equal(error.code, 'ROUTING_PROVIDER_CONFIG');
    assert.equal(error.providerCode, '10009');
    assert.match(error.message, /Web 服务/);
    assert.equal(error.retryable, false);
    assert.ok(!error.message.includes(process.env.AMAP_KEY));
    return true;
  });
  assert.equal(calls, 1);
}));

test('successful provider response with no paths is a distinct no-route failure', () => scenario(async (amap) => {
  global.fetch = async () => response({ status: '1', route: { paths: [] } });
  await assert.rejects(amap.planWalkingSegment(origin, destination), { code: 'ROUTING_NO_ROUTE', status: 422 });
}));

test('missing or malformed geometry never produces navigation', () => scenario(async (amap) => {
  for (const polyline of ['', '118.96,32.15', '118.96,32.15;broken;118.97,32.16']) {
    const data = structuredClone(valid);
    data.route.paths[0].steps[0].polyline = polyline;
    global.fetch = async () => response(data);
    await assert.rejects(amap.planWalkingSegment(origin, destination), { code: 'ROUTING_INVALID_RESPONSE' });
  }
}));

test('real geometry is preserved and preferred Web service key stays on server request', () => scenario(async (amap) => {
  process.env.AMAP_WEB_SERVICE_KEY = 'test-preferred-not-a-real-key';
  let calls = 0;
  global.fetch = async (url) => {
    calls++;
    assert.equal(new URL(url).searchParams.get('key'), process.env.AMAP_WEB_SERVICE_KEY);
    return response(valid);
  };
  const route = await amap.planWalkingSegment(origin, destination);
  assert.equal(route.mode, 'real');
  assert.equal(route.distance, 1500);
  assert.equal(route.duration, 1100);
  assert.equal(route.coordinates.length, 3);
  assert.ok(amap.isNavigableRoute([route]));
  assert.equal(amap.isNavigableRoute([{ ...route, mode: 'approx' }]), false);
  assert.equal(amap.isNavigableRoute([{ ...route, steps: [] }]), false);
  await amap.planWalkingSegment(origin, destination);
  assert.equal(calls, 1, 'only real successes are cached');
}));

test('temporary rate limit retries and recovers to real geometry', () => scenario(async (amap) => {
  let calls = 0;
  global.fetch = async () => response(++calls === 1 ? { status: '0', infocode: '10004' } : valid);
  assert.equal((await amap.planWalkingSegment(origin, destination)).mode, 'real');
  assert.equal(calls, 2);
}));

test('API exposes safe typed failure without route segments or key', () => scenario(async (amap) => {
  const { POST } = load('app/api/route/walking/route.ts', {
    '@/lib/amap': amap, 'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
  });
  global.fetch = async () => response({ status: '0', infocode: '10009' });
  const result = await POST(new Request('https://example.test/api/route/walking', {
    method: 'POST', body: JSON.stringify({ stops: [origin, destination] }),
  }));
  assert.equal(result.status, 503);
  const body = await result.json();
  assert.equal(body.code, 'ROUTING_PROVIDER_CONFIG');
  assert.equal(body.providerCode, '10009');
  assert.equal(body.retryable, false);
  assert.equal(body.segments, undefined);
  assert.ok(!JSON.stringify(body).includes(process.env.AMAP_KEY));
}));
