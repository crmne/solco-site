/* One headline assignment per page load. No cookie, browser storage or ID.
   Keep this before Plausible and before the body to avoid a headline flash. */
(function () {
  const variants = ['stop-preparing', 'find-the-set'];
  const params = new URLSearchParams(location.search);
  const requested = params.get('hook');
  const preview = params.has('hook');
  const variant = preview
    ? (variants.includes(requested) ? requested : 'find-the-set')
    : variants[Math.random() < .5 ? 0 : 1];

  document.documentElement.dataset.heroHook = variant;
  window.solcoHookTest = Object.freeze({
    variant,
    preview,
    props: Object.freeze({ experiment: 'hero-hook-v1', variant })
  });
})();
