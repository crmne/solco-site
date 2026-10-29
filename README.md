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

`ruby script/check_hook_test.rb` checks headline allocation and analytics
exclusions using Node's built-in VM, with no network or extra packages.

The homepage uses `site/assets/css/home.css` for its layout.
Serve `site/` locally to review it; `?still` stops the demos for a
static comparison, `?hook=stop-preparing` and `?hook=find-the-set` select the
two headline previews (excluded from analytics), and the page follows the
system's light or dark appearance.
The form uses the real waitlist endpoint, so automated checks must intercept
requests instead of creating test signups. Publishing still happens only on a
push to `main`; the local review does not publish anything.
