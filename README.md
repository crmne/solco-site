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

`ruby script/check_hook_test.rb` checks three-way homepage allocation and analytics
exclusions using Node's built-in VM, with no network or extra packages.

The homepage uses `site/assets/css/home.css` for its layout.
Serve `site/` locally to review it; `?still` stops the demos for a
static comparison, `?hook=original`, `?hook=stop-preparing` and
`?hook=find-the-set` select the three page previews (excluded from analytics), and the page follows the
system's light or dark appearance.
The form uses the real waitlist endpoint, so automated checks must intercept
requests instead of creating test signups. Publishing still happens only on a
push to `main`; the local review does not publish anything.

The current experiment is `homepage-v2`, with equal thirds. The original
page fragments in `homepage-test.js` come from
[the pre-test revision](https://github.com/crmne/solco-site/commit/8dc09205421ce75cc76e31033f48885b8710c87b), except for the
shared current consent notice. They enter the DOM before the deferred demo
and form scripts initialise. `home.css` scopes the revised design to the
two newer arms; the mobile payoff fix applies to all three. Keep the old
`hook-test.js` available for cached pages from the retired two-way test.
