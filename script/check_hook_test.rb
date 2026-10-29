# Run the browser's small assignment/configuration code in Node's isolated VM.
# No browser, network, storage or additional package is needed.
require "open3"

checks = <<~'JS'
  const fs = require('node:fs');
  const vm = require('node:vm');
  const assert = require('node:assert/strict');
  const source = fs.readFileSync('site/assets/js/homepage-test.js', 'utf8');
  const html = fs.readFileSync('site/index.html', 'utf8');
  const init = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x => x[1]).find(x => x.includes('plausible.init'));
  assert(init, 'analytics configuration is present');
  assert(html.indexOf('assets/js/homepage-test.js') < html.indexOf('async src="https://stats.'), 'assign before analytics loads');
  assert.match(html, /<html[^>]+data-hero-hook="find-the-set"/, 'B is the no-JavaScript fallback');
  const cases = [
    [0, '', 'original', false], [1/3 - 1e-9, '', 'original', false],
    [1/3, '', 'stop-preparing', false], [2/3 - 1e-9, '', 'stop-preparing', false],
    [2/3, '', 'find-the-set', false], [.999999, '', 'find-the-set', false],
    [.9, '?hook=original', 'original', true],
    [.9, '?hook=stop-preparing', 'stop-preparing', true],
    [.1, '?hook=find-the-set', 'find-the-set', true],
    [.1, '?hook=anything-else', 'find-the-set', true], [.1, '?hook=', 'find-the-set', true]
  ];
  for (const [random, search, variant, preview] of cases) {
    const sandbox = {URLSearchParams, Math: {random: () => random, floor: Math.floor}, location: {search}, document: {readyState: 'loading', addEventListener() {}, documentElement: {dataset: {}, setAttribute() {}}}};
    sandbox.window = sandbox;
    for (const key of ['localStorage', 'sessionStorage']) Object.defineProperty(sandbox, key, {get() {throw Error('Storage must not be read');}});
    Object.defineProperty(sandbox.document, 'cookie', {get() {throw Error('Cookies must not be read');}, set() {throw Error('Cookies must not be set');}});
    vm.runInNewContext(source, sandbox);
    vm.runInNewContext(init, sandbox);
    assert.equal(sandbox.document.documentElement.dataset.heroHook, variant);
    assert.equal(sandbox.solcoHookTest.preview, preview);
    assert.equal(Object.isFrozen(sandbox.solcoHookTest), true);
    assert.equal(Object.isFrozen(sandbox.solcoHookTest.props), true);
    const options = sandbox.plausible.o;
    assert.equal(JSON.stringify(options.customProperties()), JSON.stringify({experiment: 'homepage-v2', variant}));
    const event = {n: 'Waitlist: Submitted'};
    assert.equal(options.transformRequest(event), preview ? null : event);
    // Query changes during the page lifetime cannot silently reassign an event.
    sandbox.location.search = '?hook=find-the-set';
    assert.equal(options.customProperties().variant, variant);
  }
  console.log('Homepage experiment checks passed: 11 assignment/preview cases; equal thirds, analytics labels, preview exclusion, no storage and immutable assignment.');
JS

stdout, stderr, status = Open3.capture3("node", "-e", checks, chdir: File.expand_path("..", __dir__))
print stdout
warn stderr unless stderr.empty?
exit status.exitstatus
