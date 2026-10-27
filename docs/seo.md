# Search

What getsolco.com tells search engines and link previews, and where the
words come from. The research behind it, with the comparison page drafts,
is on the `seo-comparisons` branch in `docs/seo-comparisons/`.

## Checked on every publish

`ruby script/check_seo.rb` (run by `.github/workflows/pages.yml`): one
title (65 characters at most), a description (160 at most) and a canonical
URL per indexable page, one `h1`, `alt` on every image, JSON-LD that parses,
a sitemap that lists exactly the indexable pages, and an FAQPage block on the
home page that says what the visible FAQ says. After changing the FAQ, run
`ruby script/check_seo.rb --write` to rewrite that block.

## The home page

- Structured data: `WebSite`, `Organization` (PlentyLabs), `SoftwareApplication`
  (no `offers` until there is a price, no ratings ever), `VideoObject` for the
  90-second film, and the generated `FAQPage`. Update the video's
  `uploadDate` and `duration` when the film is recut.
- No hreflang: the only German is inside the bilingual privacy notice and
  Impressum, one URL each.
- `site/llms.txt` lists every help-centre article
  (`ruby script/check_help_links.rb --llms` prints the list).

## Words to be found by

The searches DJs make that Solco honestly answers, from the autocomplete
research (search volumes still to fill from Ahrefs):

| Search | Where it lives on the home page |
| --- | --- |
| DJ library app, DJ library management (software) | Title, description, the FAQ "Is Solco a rekordbox alternative?", the `SoftwareApplication` data |
| rekordbox alternative (also Linux, free) | The FAQ "Is Solco a rekordbox alternative?" (prep and USB, not performing; macOS, Windows and Linux) |
| CDJ USB without rekordbox, rekordbox USB export | Title, "No rekordbox needed", the USB chapter, the FAQ "Do I need rekordbox?" |
| rekordbox USB export slow | The USB race: 12 minutes against 3½ hours, with its conditions |
| AI beatgrids, beatgrid rekordbox alternative | Title, the Beatgrids chapter and the measured GTZAN results |
| rekordbox duplicate tracks | The Duplicates chapter |

Work them in only where the sentence is better for it. No keyword lists, no
hidden text, no claims the page doesn't source.

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

The `getsolco.com` domain property (DNS TXT
`google-site-verification`, in crmne/terraform `domain/domains.tf`) covers
support.getsolco.com too. Sitemaps submitted: `https://getsolco.com/sitemap.xml`
and the help centre's `https://support.getsolco.com/hc/solco/sitemap.xml`
(Chatwoot's robots.txt doesn't name it, so it has to be submitted). Bing
Webmaster Tools imports the sites from Search Console.
