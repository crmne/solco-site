# getsolco.com

The website of Solco, the prep studio for DJs. Plain static files in `site/`,
published to GitHub Pages on every push to `main`.

`og/og.html` is the share image; render it with `og/render.mjs`.

Links to help center articles at support.getsolco.com are checked by
`ruby script/check_help_links.rb`: against the articles in the Solco
repository (`../solco/docs/help-center`, or `SOLCO_HELP_CENTER`) when it is
beside this one, and against the live help center otherwise, as in the
publish workflow. `site/llms.txt` lists every article; print the list with
`ruby script/check_help_links.rb --llms`.

`ruby script/check_seo.rb` checks titles, descriptions, canonicals, alt text,
structured data and the sitemap ([docs/seo.md](docs/seo.md)); analytics events
and goals are in [docs/analytics.md](docs/analytics.md).

The homepage uses `site/assets/css/home.css` for its layout.
Serve `site/` locally to review it; `?still` stops the demos for a
static comparison; `?hook=original` and `?hook=stop-preparing` select the two
page previews (excluded from analytics), and the page follows the
system's light or dark appearance.
The form uses the real waitlist endpoint, so automated checks must intercept
requests instead of creating test signups. Publishing still happens only on a
push to `main`; the local review does not publish anything.

The current experiment is `homepage-v3`, with equal halves between the original
and revised **Stop preparing your tracks** pages. The owner retired
**Find the set** on 1 November 2026. Its old preview URL now shows Stop preparing
and remains excluded from analytics. The original
page fragments in `homepage-test-v3.js` come from
[the pre-test revision](https://github.com/crmne/solco-site/commit/8dc09205421ce75cc76e31033f48885b8710c87b), except for the
shared current consent notice. They enter the DOM before the deferred demo
and form scripts initialise. `home.css` scopes the revised design to the
revised arm; the mobile payoff fix applies to both. Keep `hook-test.js` and
`homepage-test.js` available and unchanged for cached pages from retired tests.
Read [the experiment ledger](docs/analytics.md) before comparing results across
the change in allocation. The social image and its editable source are restored
to **Stop preparing your tracks**, with a fresh image cache key.
