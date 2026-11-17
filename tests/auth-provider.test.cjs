const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the provider's async state transitions without a browser or backend.
const code = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../src/AuthProvider.tsx'), 'utf8'),
  { compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.React,
    esModuleInterop: true,
  } }
).outputText;

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const existingUser = { id: 'existing-user', email: 'test@example.test' };
const ok = { ok: true, status: 204 };
const userResponse = { ok: true, json: async () => existingUser };
const flush = () => new Promise(resolve => setImmediate(resolve));

function provider(apiFetch, initialUser = null, endpoints) {
  const states = [];
  const effects = [];
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useState(initial) {
      const index = states.length;
      states.push(index === 0 ? initialUser : initial);
      return [states[index], value => { states[index] = value; }];
    },
    useRef: initial => ({ current: initial }),
    useEffect: effect => effects.push(effect),
    createElement: (type, props) => ({ props }),
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: name => {
      if (name === 'react') return react;
      if (name === './api') return { apiFetch };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  const { props } = exports.AuthProvider({ children: null, endpoints });
  return {
    auth: props.value,
    mount: () => effects[0](),
    get user() { return states[0]; },
    get loading() { return states[1]; },
  };
}

test('a pending /me response cannot restore the user after logout', async () => {
  const pending = deferred();
  const app = provider(url => url.endsWith('/me') ? pending.promise : Promise.resolve(ok));
  app.mount();
  await app.auth.logout();
  pending.resolve(userResponse);
  await flush();
  assert.equal(app.user, null);
  assert.equal(app.loading, false);
});

test('pending JSON parsing cannot restore the user after logout', async () => {
  const body = deferred();
  const app = provider(async url => url.endsWith('/me') ? { ok: true, json: () => body.promise } : ok);
  app.mount();
  await flush();
  await app.auth.logout();
  body.resolve(existingUser);
  await flush();
  assert.equal(app.user, null);
});

for (const operation of ['login', 'refresh']) {
  test(`pending ${operation} cannot fetch the user after logout`, async () => {
    const pending = deferred();
    const requests = [];
    const app = provider(url => {
      requests.push(url);
      return url.endsWith(`/${operation}`) ? pending.promise : Promise.resolve(ok);
    }, existingUser);
    const action = app.auth[operation]({ email: 'test@example.test', password: 'synthetic' });
    await app.auth.logout();
    pending.resolve(ok);
    await action;
    assert.equal(requests.some(url => url.endsWith('/me')), false);
    assert.equal(app.user, null);
  });
}

test('requests started during logout are invalidated when logout succeeds', async () => {
  const logout = deferred();
  const pendingUser = deferred();
  const app = provider(async url => {
    if (url.endsWith('/logout')) return logout.promise;
    if (url.endsWith('/me')) return pendingUser.promise;
    return ok;
  }, existingUser);
  const signingOut = app.auth.logout();
  const refreshing = app.auth.refresh();
  await flush();
  logout.resolve(ok);
  await signingOut;
  pendingUser.resolve(userResponse);
  await refreshing;
  assert.equal(app.user, null);
});

for (const failure of ['http', 'network']) {
  test(`${failure} logout failure preserves the user despite a stale /me failure`, async () => {
    const pending = deferred();
    const app = provider(async url => {
      if (url.endsWith('/me')) return pending.promise;
      if (failure === 'network') throw new Error('Network unavailable');
      return { ok: false, status: 500 };
    }, existingUser);
    app.mount();
    await assert.rejects(app.auth.logout(), {
      message: failure === 'http' ? 'Logout failed (HTTP 500)' : 'Network unavailable',
    });
    pending.reject(new Error('Stale request failed'));
    await flush();
    assert.equal(app.user, existingUser);
    assert.equal(app.loading, false);
  });
}

test('fresh login after logout still loads the user', async () => {
  const app = provider(async url => url.endsWith('/me') ? userResponse : ok);
  await app.auth.logout();
  await app.auth.login({ email: 'test@example.test', password: 'synthetic' });
  assert.equal(app.user, existingUser);
  assert.equal(app.loading, false);
});

test('effect cleanup discards pending user responses', async () => {
  const pending = deferred();
  const app = provider(() => pending.promise);
  const cleanup = app.mount();
  cleanup();
  pending.resolve(userResponse);
  await flush();
  assert.equal(app.user, null);
  assert.equal(app.loading, true);
});

const apiCode = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../src/api.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;

function realApi(fetch, baseUrl = 'https://app.example.test/') {
  const exports = {};
  vm.runInNewContext(apiCode, { exports, fetch, URL, document: { baseURI: baseUrl } });
  return exports.apiFetch;
}

for (const config of [
  {
    name: 'custom HTTPS API and refresh path',
    endpoints: { baseUrl: 'https://auth.example.test', user: '/api/user', refresh: '/session/renew' },
    userUrl: 'https://auth.example.test/api/user',
    refreshUrl: 'https://auth.example.test/session/renew',
  },
  {
    name: 'default localhost API',
    endpoints: undefined,
    userUrl: 'http://localhost:4000/me',
    refreshUrl: 'http://localhost:4000/refresh',
  },
  {
    name: 'same-origin relative API',
    endpoints: { baseUrl: '', user: '/api/user', refresh: '/api/renew' },
    userUrl: 'https://app.example.test/api/user',
    refreshUrl: 'https://app.example.test/api/renew',
  },
]) {
  test(`automatic refresh uses the provider configuration: ${config.name}`, async () => {
    const requests = [];
    const app = provider(realApi(async (url, options) => {
      requests.push({ url, options });
      if (requests.length === 1) return { ok: false, status: 401 };
      return url === config.refreshUrl ? ok : userResponse;
    }), null, config.endpoints);
    app.mount();
    await flush();
    assert.deepEqual(requests.map(request => request.url), [
      config.userUrl, config.refreshUrl, config.userUrl,
    ]);
    assert.equal(requests[1].options.method, 'POST');
    assert.equal(requests.every(request => request.options.credentials === 'include'), true);
    assert.equal(app.user, existingUser);
  });
}

test('login, logout, and explicit refresh pass the configured refresh URL', async () => {
  const requests = [];
  const app = provider(async (url, options, refreshUrl) => {
    requests.push({ url, refreshUrl });
    return url.endsWith('/me') ? userResponse : ok;
  }, null, { baseUrl: 'https://auth.example.test', refresh: '/session/renew' });
  await app.auth.login({ email: 'test@example.test', password: 'synthetic' });
  await app.auth.refresh();
  await app.auth.logout();
  assert.deepEqual(requests.map(request => request.url), [
    'https://auth.example.test/login',
    'https://auth.example.test/me',
    'https://auth.example.test/session/renew',
    'https://auth.example.test/me',
    'https://auth.example.test/logout',
  ]);
  assert.equal(requests.every(request => request.refreshUrl === 'https://auth.example.test/session/renew'), true);
});

test('failed automatic refresh returns the original 401 without retrying', async () => {
  const requests = [];
  const unauthorized = { ok: false, status: 401 };
  const apiFetch = realApi(async url => {
    requests.push(url);
    return unauthorized;
  });
  assert.equal(await apiFetch('/api/me', {}, '/api/renew'), unauthorized);
  assert.deepEqual(requests, ['https://app.example.test/api/me', 'https://app.example.test/api/renew']);
});

test('an unauthorized refresh endpoint is not refreshed again', async () => {
  let count = 0;
  const unauthorized = { ok: false, status: 401 };
  const apiFetch = realApi(async () => { count += 1; return unauthorized; });
  assert.equal(await apiFetch('/api/renew', { method: 'POST' }, '/api/renew'), unauthorized);
  assert.equal(count, 1);
});

test('retry preserves the original request and stops after one retry', async () => {
  const requests = [];
  const unauthorized = { ok: false, status: 401 };
  const apiFetch = realApi(async (url, options) => {
    requests.push({ url, options });
    return url === 'https://app.example.test/api/renew' ? ok : unauthorized;
  });
  const result = await apiFetch('/api/login', {
    method: 'POST', body: JSON.stringify({ email: 'test@example.test', password: 'synthetic' }),
  }, '/api/renew');
  assert.equal(result, unauthorized);
  assert.deepEqual(requests.map(request => request.url), [
    'https://app.example.test/api/login',
    'https://app.example.test/api/renew',
    'https://app.example.test/api/login',
  ]);
  assert.equal(requests[2].options.method, requests[0].options.method);
  assert.equal(requests[2].options.body, requests[0].options.body);
  assert.equal(requests[2].options.credentials, 'include');
});

for (const url of [
  'http://auth.example.test/login',
  'http://192.168.1.10/login',
  'http://localhost.example.test/login',
  'http://localhost@evil.example.test/login',
  'ftp://auth.example.test/login',
  'data:text/plain,credentials',
]) {
  test(`insecure authentication URL is rejected before fetch: ${url}`, async () => {
    let calls = 0;
    const apiFetch = realApi(async () => { calls += 1; return ok; });
    await assert.rejects(apiFetch(url, { method: 'POST', body: 'synthetic credentials' }), /must use HTTPS/);
    assert.equal(calls, 0);
  });
}

for (const url of [
  'https://auth.example.test/login',
  'http://localhost:4000/login',
  'http://127.0.0.1:4000/login',
  'http://[::1]:4000/login',
]) {
  test(`secure or loopback authentication URL is allowed: ${url}`, async () => {
    const calls = [];
    const apiFetch = realApi(async (target, options) => { calls.push({ target, options }); return ok; });
    assert.equal(await apiFetch(url), ok);
    assert.equal(calls[0].target, url);
    assert.equal(calls[0].options.redirect, 'error');
  });
}

test('relative endpoints on a remote HTTP page are rejected', async () => {
  let calls = 0;
  const apiFetch = realApi(async () => { calls += 1; return ok; }, 'http://app.example.test/');
  await assert.rejects(apiFetch('/api/login'), /must use HTTPS/);
  await assert.rejects(apiFetch('//auth.example.test/login'), /must use HTTPS/);
  assert.equal(calls, 0);
});

test('relative endpoints remain available on localhost HTTP pages', async () => {
  const calls = [];
  const apiFetch = realApi(async url => { calls.push(url); return ok; }, 'http://localhost:3000/');
  await apiFetch('/api/login');
  assert.deepEqual(calls, ['http://localhost:3000/api/login']);
});

test('an insecure refresh URL is rejected before sending the initial request', async () => {
  let calls = 0;
  const apiFetch = realApi(async () => { calls += 1; return ok; });
  await assert.rejects(apiFetch('https://auth.example.test/me', {}, 'http://auth.example.test/renew'), /must use HTTPS/);
  assert.equal(calls, 0);
});

test('provider login never sends credentials to a remote HTTP API', async () => {
  let calls = 0;
  const app = provider(realApi(async () => { calls += 1; return ok; }), null, {
    baseUrl: 'http://auth.example.test',
  });
  await assert.rejects(app.auth.login({ email: 'test@example.test', password: 'synthetic' }), /must use HTTPS/);
  assert.equal(calls, 0);
});

test('initial, refresh, and retry requests all reject redirects', async () => {
  const requests = [];
  const apiFetch = realApi(async (url, options) => {
    requests.push(options);
    return requests.length === 1 ? { ok: false, status: 401 } : ok;
  });
  await apiFetch('/api/login', { redirect: 'follow' }, '/api/renew');
  assert.equal(requests.length, 3);
  assert.equal(requests.every(options => options.redirect === 'error'), true);
});
