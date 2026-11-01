# Run the browser's small assignment/configuration code in Node's isolated VM.
# No browser, network, storage or additional package is needed.
require "open3"

checks = <<~'JS'
  const fs = require('node:fs');
  const vm = require('node:vm');
  const assert = require('node:assert/strict');
  const source = fs.readFileSync('site/assets/js/homepage-test-v3.js', 'utf8');
  const html = fs.readFileSync('site/index.html', 'utf8');
  const init = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x => x[1]).find(x => x.includes('plausible.init'));
  assert(init, 'analytics configuration is present');
  assert(html.indexOf('assets/js/homepage-test-v3.js') < html.indexOf('async src="https://stats.'), 'assign before analytics loads');
  assert.match(html, /<html[^>]+data-hero-hook="stop-preparing"/, 'Stop preparing is the no-JavaScript fallback');
  assert.doesNotMatch(html, /Find the set|find-the-set/, 'the retired hook is absent from the page and share metadata');
  const cases = [
    [0, '', 'original', false], [0.5 - 1e-9, '', 'original', false],
    [0.5, '', 'stop-preparing', false], [.999999, '', 'stop-preparing', false],
    [.9, '?hook=original', 'original', true],
    [.9, '?hook=stop-preparing', 'stop-preparing', true],
    [.1, '?hook=find-the-set', 'stop-preparing', true],
    [.1, '?hook=anything-else', 'stop-preparing', true], [.1, '?hook=', 'stop-preparing', true]
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
    assert.equal(JSON.stringify(options.customProperties()), JSON.stringify({experiment: 'homepage-v3', variant}));
    const event = {n: 'Waitlist: Submitted'};
    assert.equal(options.transformRequest(event), preview ? null : event);
    // Query changes during the page lifetime cannot silently reassign an event.
    sandbox.location.search = '?hook=find-the-set';
    assert.equal(options.customProperties().variant, variant);
  }
  console.log('Homepage experiment checks passed: 9 assignment/preview cases; equal halves, analytics labels, retired-hook fallback, preview exclusion, no storage and immutable assignment.');
JS

stdout, stderr, status = Open3.capture3("node", "-e", checks, chdir: File.expand_path("..", __dir__))
print stdout
warn stderr unless stderr.empty?
exit status.exitstatus
