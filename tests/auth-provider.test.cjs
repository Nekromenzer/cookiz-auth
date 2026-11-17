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

function provider(apiFetch, initialUser = null) {
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
  const { props } = exports.AuthProvider({ children: null });
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
