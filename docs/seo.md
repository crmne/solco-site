# Search

What getsolco.com tells search engines and link previews, and where the
words come from. The research behind it, with the comparison page drafts,
is on the `seo-comparisons` branch in `docs/seo-comparisons/`.

## Clean URLs

Every page is published at a URL without `.html`: `/linux`, `/onelibrary`,
`/cdj-usb-without-rekordbox`, `/beatgrids`, `/measured`, `/privacy`,
`/impressum`, `/terms`, and `/app-privacy/` (a folder, as before). GitHub
Pages serves `name.html` at `/name` with a 200, so the files keep their
names and nothing about their assets changes.

The old `.html` addresses still answer with the same page (Pages can't
send a real redirect, and a redirect page at `name.html` would loop,
because `/name` is served from that same file). Each page says which URL is
the real one: its canonical, `og:url`, structured data, the sitemap,
`llms.txt` and every internal link use the clean URL, and a line at the top
of the head (`CLEAN_ADDRESS` in `script/check_seo.rb`) swaps the address
bar to it before analytics records the visit. Search engines fold the
`.html` copies into the clean URLs by the canonical. Moving pages to
`name/index.html` would have given real redirects only for `/name` to
`/name/` with a trailing slash, and old links would still have needed
redirect pages.

Keep it that way: link pages as `/name`, never `name.html`; the check
fails on a `.html` link, canonical, `og:url`, structured-data URL or
`llms.txt` entry. The retired homepage experiment scripts still link
`.html` URLs and stay unchanged; those links still work.

## Share images

Each guide has its own share image, `site/og/<page>.jpg` (1200 by 630),
a still of the page's own hero: serve `site/` on port 8765 and run
`node og/render-guides.mjs` after changing a hero. The home page,
`/measured` and the legal pages use `og.png`.

## Checked on every publish

`ruby script/check_seo.rb` (run by `.github/workflows/pages.yml`): one
title (65 characters at most), a description (160 at most) and a canonical
URL per indexable page, one `h1`, `alt` on every image, JSON-LD that parses,
a sitemap that lists exactly the indexable pages, each with a `lastmod`
(the date the page's words last changed, from `git log`; a link-only
change doesn't count), and on every page with
questions (the home page and the guides) an FAQPage block that says what the
visible questions say. After changing questions, run
`ruby script/check_seo.rb --write` to rewrite those blocks.

## The home page

- Structured data: `WebSite`, `Organization` (PlentyLabs), `SoftwareApplication`
  (no ratings ever), `VideoObject` for the 90-second film, and the generated
  `FAQPage`.
- `SoftwareApplication.offers` describes what a visitor can get today: one
  `Offer` for the free private beta (price 0 EUR, `LimitedAvailability`,
  because keys go out by invitation from the waitlist, `url` the waitlist).
  The terms of sale list the full release's prices, but nothing can be bought
  on the site yet, so those prices are not offers. When the buy flow goes
  live, replace it with the licences a buyer can order then (Solco and Solco
  Intro, in EUR and USD, as the terms give them), and drop the beta offer
  when the beta closes. Update the video's
  `uploadDate` and `duration` when the film is recut.
- No hreflang: the only German is inside the bilingual privacy notice and
  Impressum, one URL each.
- `site/llms.txt` lists every help-centre article
  (`ruby script/check_help_links.rb --llms` prints the list).

## Strategy (5 November 2026)

Solco is new, so nobody searches for it yet, and the broad searches are
taken: "rekordbox alternative" returns listicles of performance apps (Mixxx,
Serato), and Lexicon owns "DJ library management software". The winnable
searches are specific jobs where today's results are thin, spammy or only
the vendor's own notice, and where Solco has a true, checkable answer.
Each gets one page that answers it fully, in the home page's design, with
its own questions, help-centre links and the waitlist card.

Research, read on 5 November 2026: Google autocomplete (`hl=en-GB`,
`gl=gb`) for 37 seeds, the top results for nine queries, and the vendors'
own pages. Search volumes came later, from Ahrefs on 13 November 2026 (the
full report, with sources, SERPs and the technical check, is
`~/Code/announcements/seo/getsolco.com.md`): the target keywords below are
tracked in Ahrefs Rank Tracker (project 10533470) in the US, the UK and
Germany, tagged by the page that should rank. On 13 November only "solco"
ranked (position 1 in Search Console).

| Keyword | Volume, US / UK / DE | KD | Page that should rank |
| --- | --- | --- | --- |
| rekordbox linux | 90 / 50 / 100 | 0 (DE 2) | `/linux` |
| rekordbox on linux | 20 / 10 / 10 | n/a | `/linux` |
| linux dj software | 60 / 20 / 50 | 3 (DE 0) | `/linux` |
| dj software linux | 40 / 10 / 50 | 1 | `/linux` |
| onelibrary | 80 / 50 / 10 | n/a | `/onelibrary` |
| onelibrary rekordbox | 20 / 10 / 0 | n/a | `/onelibrary` |
| device library | 40 / - / - | n/a | `/onelibrary` |
| cdj 3000x | 1,600 / 600 / 1,800 | 0 | `/onelibrary` (a stretch: mostly shopping) |
| rekordbox export to usb | 30 / 20 / 20 | 1 | `/cdj-usb-without-rekordbox` |
| rekordbox usb format | 50 / - / - | 0 | `/cdj-usb-without-rekordbox` |
| cdj usb format | 20 / - / - | 0 | `/cdj-usb-without-rekordbox` |
| cdj usb without rekordbox | 0 in Ahrefs | n/a | `/cdj-usb-without-rekordbox` (tracked for intent) |
| beatgrid | 60 / - / - | 0 | `/beatgrids` |
| dj library management | 40 / 10 / 10 | 27 | `/` |
| dj library management software | 40 / 10 / 0 | n/a | `/` (Lexicon holds "dj management software" at 1) |
| dj music organizer | 30 / 0 / 0 | n/a | `/`, later `/compare/` |
| how to organize dj library | 40 / 0 / 0 | 0 | a new guide |
| rekordbox alternative | 20 / 20 / 30 | n/a | `/` (FAQ), later `/compare/rekordbox/` |
| solco | n/a | n/a | `/` |

Questions DJs ask that suit a guide, from the same pass: "is rekordbox
free" (800 US, KD 3), "memory cue vs hot cue" (60 US, KD 0), "how to
organize dj library" (40 US, KD 0). The biggest volumes in reach are brand
names (mixed in key 2,900 US, lexicon dj 900, mixo 500), for the
comparison pages, and hardware (xdj az 5,700 US, cdj 3000x 1,600 US).

The order in the table below was set by fit and how weak the current
results were; the volumes above bear it out.

| Searches | What ranks now | The page that answers |
| --- | --- | --- |
| rekordbox linux, rekordbox on linux, rekordbox wine, rekordbox linux alternative, dj software linux | A change.org petition, the Pioneer community's "no", CrossOver's listing, a CachyOS thread where the DJ gave up and used a Windows VM, spam pages | `/linux`: rekordbox lists only Windows and macOS ([requirements](https://rekordbox.com/en/download/#system)); Solco installs as a package and writes the stick |
| onelibrary, onelibrary vs device library, onelibrary rekordbox cdj 2000, cdj-3000x usb, cdj 3000x onelibrary, xdj-az usb | rekordbox's FAQ, AlphaTheta's notice, news posts. No plain table of which player reads which | `/onelibrary`: the table from [AlphaTheta's notice of 18 March 2026](https://alphatheta.com/en/information/important-notice-for-customers-using-usb-devices-with-our-dj-equipment/), and Solco writing both |
| cdj without rekordbox, do you need rekordbox for cdj, cdj 3000 without rekordbox, rekordbox usb export slow, rekordbox usb export stuck | VirtualDJ news and forum threads, dj.studio's help | `/cdj-usb-without-rekordbox`: what goes on the stick, five steps (`HowTo`), formats, sharing a stick with rekordbox, the measured export time |
| fix beatgrid rekordbox, beatgrid fixer, beatgrid rekordbox alternative, rekordbox beatgrid wrong | Blog how-tos for rekordbox's own editor, forum threads | `/beatgrids`: grids that follow tempo changes, the short list to check, how to fix one (`HowTo`), the GTZAN results |
| DJ library app, Solco | The home page | `/`: the title, the `SoftwareApplication` data, the FAQ |

Not targeted, and why: "rekordbox alternative" on its own (performance
apps; the home page's FAQ answers it for prep and USB); "dj library
management software" (Lexicon's); "key detection" (no demand in
autocomplete, and no key-accuracy claims, by rule); "mixed in key
alternative" (would invite an accuracy comparison).

Honesty rules for these pages: Lexicon also writes Pioneer drives without
rekordbox ([its manual](https://www.lexicondj.com/manual/sync-to-pioneer-usb)),
and rekordbox 7.2.11 and later also write both libraries, so no page says
Solco is the only way or the only one writing both. The two measured
claims (USB time, GTZAN grids) appear only with their conditions and a link
to `/measured`. Tested players are named as the release notes name
them; untried ones (both libraries on a CDJ-3000X, exFAT and HFS+ on any
player) are said plainly. Prices only as the terms of sale give them.

### Internal links

- Home page: the Beatgrids chapter links `/beatgrids`, the USB
  chapter `/cdj-usb-without-rekordbox`; "Plays in the club" links
  `/onelibrary` and "Runs on your machine" `/linux`; the FAQ's
  rekordbox, players and computers answers link the matching guide; the
  footer has a Guides line on every page that has the footer.
- Each guide: the top bar names all four, its "Read on" links the other
  three, the home page and four or five help-centre articles, and its
  body links siblings where the reader would go next.
- `/measured` now has the top bar and footer, and links the beat-grid
  and USB guides.
- The not-found page lists the four guides and the help centre.
- The help centre links no marketing pages.

### Structured data

- Home: as above (`WebSite`, `Organization`, `SoftwareApplication`,
  `VideoObject`, `FAQPage`). The `SoftwareApplication` screenshot pointed
  at a file that isn't published (`media/app/hero.webp`); it is now the
  film's poster.
- `/measured`: `WebPage` and `BreadcrumbList`, like the guides.
- Guides: `WebPage` (about `#solco`, part of `#website`), `BreadcrumbList`,
  `FAQPage`, and `HowTo` on the two pages with real steps (USB export,
  fixing a grid). Google shows FAQ and HowTo rich results only rarely now;
  they are there for other engines and answer engines, and must match the
  visible text (the FAQ check enforces that). `mentions` names rekordbox
  and OneLibrary; no competitor is a page's main entity, no `offers`, no
  ratings.
- No hreflang: everything indexable is English, one URL each.

### Performance

The hero's lead was the largest paint on a phone at 5.0 s, because it waited
for the scroll watcher in `site.js` to reveal it. A line in the head adds
`hero-rise`, and the hero now rises in by a CSS animation at first paint
(brought over from `site-story-redesign`, adapted so the page still shows
everything if scripts fail). Guides reuse the home page's cached CSS and
scripts and load the interface demos only when near. The homepage
experiment's script is the remaining render-blocking file; ending the
experiment removes it.

### What to measure

- Search Console, Performance, filtered by page: impressions, clicks and
  average position for each guide, and the queries each one gets. Read it
  after four weeks (from 3 December 2026), then monthly; a guide that gets
  impressions for a query it doesn't answer well gets a sentence, not a new
  page.
- Search Console, Pages: every guide indexed (request indexing for the four
  after the deploy). URL inspection on the home page to confirm Google sees
  the Stop preparing page.
- Plausible: visits by entry page for the four guides; `Waitlist: Started`
  and `Waitlist: Submitted` filtered by page (each guide has its own form);
  `Help centre: Click` with `place` to see which guides send readers to the
  help centre; Sources for `Google` and `Bing` over time.
- Plausible goal to add (in the dashboard): one pageview goal per guide
  (`/cdj-usb-without-rekordbox`, `/onelibrary`, `/beatgrids`, `/linux`), to
  read them as a group. Visits before 5 November 2026 were recorded at the
  `.html` paths.
- Bing: IndexNow already sends new and changed sitemap URLs after each
  deploy; Bing Webmaster Tools still needs the import from Search Console
  (below) to see Bing's queries.

## Comparison pages and their links

When the `/compare/` pages from `seo-comparisons` are published (after their
compliance flags are settled):

- Add each to `sitemap.xml` and to `llms.txt` under "## Comparisons".
- Home page: "Compare" in the footer nav beside Help centre (`/compare/`);
  "Do I need rekordbox?" and "Is Solco a rekordbox alternative?" each end
  with a link to `/compare/rekordbox/`; the USB race's note links the test
  method page `/compare/rekordbox/usb-test/`; the stats' "How we measured"
  links `/compare/rekordbox/beatgrid-test/`.
- Hub to every page; each page to the hub, two or three siblings (rekordbox,
  Lexicon and Mixo; Traktor, Serato and Engine DJ; Mixed In Key and
  Lexicon), its help-centre articles and `/#waitlist`.
- The help centre links no marketing pages.
- Plausible already counts their visits (pageview goal `/compare/*`).

## Search Console and Bing

The `getsolco.com` domain property in Search Console (DNS TXT
`google-site-verification`, in crmne/terraform `domain/domains.tf`) covers
support.getsolco.com too. Both sitemaps were submitted on 27 October 2026:
`https://getsolco.com/sitemap.xml` and the help centre's
`https://support.getsolco.com/hc/solco/sitemap.xml` (Chatwoot's robots.txt
doesn't name it, so it has to be submitted). Google rereads them by itself.

Bing Webmaster Tools has the site (`https://getsolco.com/`) with the same
sitemap, so Bing's queries show there.

On 5 November 2026, after the move to clean URLs, the sitemap was
resubmitted in both, indexing was requested in Search Console (URL
inspection) for the home page and the four guides, the same five URLs were
sent through Bing's URL submission, and IndexNow got the nine new clean URLs
(the publish workflow) plus the home page and the eight old `.html` URLs,
so engines recrawl them and find their canonicals.
