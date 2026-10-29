# Analytics

getsolco.com counts visits with Plausible Community Edition, self-hosted at
https://stats.paolino.me (the `stats` host in crmne/terraform, Hetzner
Helsinki). The dashboard is https://stats.paolino.me/getsolco.com.

- Script: `https://stats.paolino.me/js/pa-JCPJyXqwkHhNzi2O06dWQ.js`, the
  per-site script of Plausible 3. Its settings live in the dashboard, not in
  the page: outbound links, file downloads and form submissions are on, so
  `Outbound Link: Click`, `File Download` and `Form: Submission` come for
  free. Scroll depth and time on page come with every pageview.
- No cookies, nothing stored on the device, no IP address kept: the privacy
  notice (`site/privacy.html`, section 4) describes it. Custom events carry
  the event and a word of context, never an email address, an answer, a
  referral code or anything typed.
- Community Edition has no funnels and no Sites API. Goals are made in the
  dashboard (Site settings, Goals), and the funnels below are read by
  comparing their goals' unique conversions over the same period.
- On localhost the script sends nothing. To see the events while working,
  serve `site/` and watch the network panel, or run the page with the
  script's `captureOnLocalhost` setting.

## Events

All are sent through `track()` in `site/assets/js/site.js`
(`window.solcoTrack`), except the 404 and the
waitlist's own.

| Event | When | Properties |
| --- | --- | --- |
| `Waitlist: CTA click` | A waitlist link or button that scrolls to the form | `place`: `topbar`, `grids`, `payoff`, `final` |
| `Waitlist: Started` | The first letter typed into the email field, once per page | |
| `Waitlist: Questions shown` | A valid address sent, step two (the four questions) shown | |
| `Waitlist: Submitted` | The waitlist accepted the form | `answers`: `answered` or `skipped`; `referral`: `yes` or `no`; `form`: `hosted` when it came from the waitlist's own page |
| `Waitlist: Error` | The address was refused, or the request failed | `status`: `invalid email`, an HTTP status, or `network` |
| `Waitlist: Confirmed` | The confirmation page on waitlist.plenty.is | `referral`: `yes` or `no`; saved `experiment` and `variant` when known |
| `Referral: Visit` | A page opened with `?ref=` or `?ref_id=` (the code itself is not sent) | `landing`: `getsolco.com` or `waitlist form` |
| `Referral: Link copied` | Copy on the confirmation page's referral link | |
| `Film play` | The 90-second film opened | `from`: `top` (the hero button) or `link` (getsolco.com/#film, the app's "Watch the tour") |
| `Film: 25%`, `Film: 50%`, `Film: Finished` | How far the film was watched, once each per visit | |
| `FAQ: Opened` | A question opened | `question`: its text |
| `Help centre: Click` | A link to support.getsolco.com | `article`: the article's slug or `home`; `place`: where the link was |
| `Chapter: Reached` | A part of the story reached the middle of the screen, once each | `chapter`: `add`, `analysis`, `genre`, `tags`, `dupes`, `grids`, `playlists`, `export`, `stats`, `faq`, `final` |
| `404` | The not-found page | `path` |

Properties show in the dashboard only once they are listed in Site
settings, Custom properties: `place`, `answers`, `referral`, `status`,
`landing`, `cut`, `action`, `from`, `question`, `article`, `chapter`, `path`,
`form`, `experiment`, `variant` (and `url`, which Plausible adds to outbound
clicks and downloads). All are listed. The two headline-test properties were
added on 29 October 2026; the existing properties were preserved.

The waitlist's pages (crmne/waitlist, `analytics` in waitlist-deploy's
`products.yml`) report to this site as `/waitlist/form`, `/waitlist/thanks`
and `/waitlist/confirmed`, never their own token addresses.

## Goals

Every event above is a goal (set up on 27 October 2026, with the earlier
`Film play`, `404`, `Outbound Link: Click`, `File Download` and
`Form: Submission`), plus:

- Pageview `/compare/*` ("Visit /compare/*"): the comparison pages, once they exist.
- Scroll depth on `/` at 25, 50, 75 and 90 percent.

## Funnels

Read each as its goals' unique visitors over the same period:

1. **Waitlist**: visitors on `/`, `Waitlist: Started`,
   `Waitlist: Questions shown`, `Waitlist: Submitted`, and later
   `Waitlist: Confirmed` (in another visit, from the email, so it can't join
   a session funnel even on Plausible Cloud).
2. **Film**: `Film play`, `Film: 25%`, `Film: 50%`, `Film: Finished`.
3. **Referrals**: `Referral: Link copied`, `Referral: Visit`,
   `Waitlist: Submitted` filtered to `referral: yes`, `Waitlist: Confirmed`
   filtered the same way.
4. **Story**: `Chapter: Reached` by `chapter`, in page order, against
   visitors on `/`.

## Campaign links (UTM)

Plausible reads `utm_source`, `utm_medium` and `utm_campaign` into Sources
and Campaigns. Lower case, hyphens, no personal names or codes.

| Where | utm_source | utm_medium | utm_campaign |
| --- | --- | --- | --- |
| X post | `x` | `social` | `teaser` (later `launch`) |
| Reddit post or comment | `reddit` | `social` | `teaser` |
| BetaList listing | `betalist` | `listing` | `teaser` |
| Blog post (paolino.me) | `blog` | `referral` | the post's slug |
| Email to the waitlist | `waitlist` | `email` | what it announces, e.g. `beta-invite` |
| The film on YouTube or Vimeo | `youtube` or `vimeo` | `video` | `film` |

Add `utm_content` to tell two links in one post apart (`hero-video`,
`usb-race`). Example:
`https://getsolco.com/?utm_source=reddit&utm_medium=social&utm_campaign=teaser&utm_content=usb-race`.
Keep `#film` after the query string when a post should open the film:
`https://getsolco.com/?utm_source=x&utm_medium=social&utm_campaign=teaser#film`.

## Not counted yet

- **Downloads**: the site doesn't link the installers (the licence email
  links crmne/solco-releases on GitHub), so a download isn't seen. When the
  site links them, Plausible's `File Download` goal counts it.
- **Licence activations**: the app sends nothing to Plausible, and
  shouldn't. Count activations from solco-server's licence records instead.

## Homepage revision, 29 October 2026

This revision leads with finding tracks and building sets, retains the
existing brand and working demos, puts the free private beta offer beside the
signup, and places the form before the large demo on phones. It clarifies
that Solco prepares a collection and that the DJ chooses and reviews the music.
The two leading survey needs were finding the right track (21 of 66 answers)
and building playlists (17 of 66); those chapters now lead the tour.

These are hypotheses, not measured conversion gains. Keep the event names
above stable. Compare `Waitlist: Submitted` against landing visitors within
the same source, campaign, device and country; paid delivery changed the
country mix substantially on 28–29 October, so an overall before/after rate
would be misleading. Use distinct UTM content values for the two Reddit
communities in future posts, without identifying individual people.

Use the waitlist database for confirmed and invited cohorts, and the existing
licence records for activation within seven days of invitation. Plausible
cannot join the confirmation email's new session to the original visit.
The saved experiment label can identify its original headline, without
joining the sessions or sending any personal identifier to Plausible.
Compare reminder cohorts only after each has had the same time to activate;
an uncontrolled before/after comparison does not establish causation.

## Homepage A/B/C test: homepage-v2

The owner added the previous homepage as a control on 29 October 2026.
This starts a new experiment, `homepage-v2`, rather than changing the old
test's allocation and combining its data. Use 30 October through 12 November
2026 inclusive (Europe/Berlin) as the first two complete weeks; review on
13 November. Launch-day checks are outside that comparison window.

The waitlist cohort boundary is 29 October at 17:36:13 UTC, configured before
the new page rolls out. The same boundary closes the old report. Cached old
pages can still send v1 labels; their saved records and Plausible events keep
those labels, but signups after the cutoff are outside the closed v1 cohort.

These are three concurrent page treatments, allocated equally. Comparing the
control with either revision estimates the combined effect of layout, copy
and feature order. Only the two revised arms isolate the headline treatment.
Historical traffic to the old page is not a control: sources and campaigns
changed. Three arms need more traffic than two; sparse evidence at the review
means inconclusive, not a reason to declare the largest small count a winner.

On launch day, the shared mobile "Ready to play" section was corrected:
stacked heading, compact spacing and no wrapping capsule around its signup
prompt. This applies to all three variants before the comparison window above.

- Control: the previous page (`original`), from
  [the pre-test revision](https://github.com/crmne/solco-site/commit/8dc09205421ce75cc76e31033f48885b8710c87b),
  including its "Stop preparing your tracks" hero, description, signup layout,
  feature order and closing copy. Current consent wording and mobile fixes
  apply, as do the same form code, demos, analytics and public privacy notice.
- A: revised page, **Stop preparing your tracks.** (`stop-preparing`)
- B: revised page, **Find the set hiding in your library.** (`find-the-set`)

Between A and B, the supporting copy, imagery, type settings, form and entire
rest of the page are identical. Each headline takes its natural height, with the same gap before
the supporting copy; the shorter hook does not reserve an empty third line.
The resulting movement of content is part of the headline treatment.
`homepage-test.js` runs before the body and analytics, chooses each version
with probability 1/3, and keeps
that choice in memory for that page load. There is no cookie, local/session
storage, visitor ID or fingerprint. A fresh page load can choose differently;
this is a randomised **page-load** test, not a persistent visitor test.

`plausible.init({customProperties})` adds `experiment=homepage-v2` and
`variant=original|stop-preparing|find-the-set` to the initial pageview and every event
on this homepage. This is supported by both the
[Plausible configuration](https://plausible.io/docs/script-extensions) and the
actual self-hosted script checked on 29 October. No address, answer or typed
content is added. Other pageviews carry no assignment. The homepage's form
also sends these two fixed labels to the waitlist, which stores them only
on a new signup and includes them in its later `Waitlist: Confirmed` event.
Confirmation pageviews remain unlabelled, preserving the homepage denominator.

Review links are `/?hook=original`, `/?hook=stop-preparing` and
`/?hook=find-the-set`.
Any `hook` query parameter means preview: recognised values select the copy,
anything else shows B, and `transformRequest` suppresses all Plausible events.
Preview forms also omit experiment labels from the signup request.
Never use these links in ads, announcements or outreach for the experiment;
use the ordinary homepage with UTM tags. CTA navigation preserves the query
string, so previews stay excluded after reload and campaigns stay intact.
Without JavaScript, B and the hosted-form fallback remain usable, unmeasured.

### Reading the result

Primary metric: **accepted form submissions / assigned homepage pageviews**,
separately for the control, A and B, filtered to `experiment=homepage-v2`. Use total
`Waitlist: Submitted` events and total pageviews, not the dashboard's unique
visitor conversion percentage: a person can see more than one version. Count at most one
submission per successful page load. A retry after an error may submit again,
but repeating after success sends and counts nothing.

An accepted form response is not proof of a new confirmed person. The waitlist
intentionally gives the same response for existing addresses and silently
refused spam. For actual new entries, use the **Signup experiment** table at
[the waitlist admin](https://waitlist.plenty.is/admin/products/solco). It shows
signed up, confirmed and pending for each variant, across all list filters.
The CSV also includes `experiment` and `variant`. Duplicate submissions
neither add a row nor replace or backfill its original assignment. Unknown,
legacy and preview assignments remain **Unattributed**. These counts are
retained records: leaving, expiry and deletion remove them, including
unconfirmed entries after seven days. They are not lifetime event totals.

The saved labels survive a missing browser analytics event and a later email
confirmation. Plausible's labelled `Waitlist: Confirmed` events remain partial
when analytics is blocked or unavailable. Use the admin for actual retained
entries, and Plausible for measured traffic and funnel behaviour. Do not treat
database signups divided by partially measured pageviews as a precise rate,
or call any of these metrics sales, customer acquisition or revenue.

Launch-day repair: the database had one new site signup at 16:20:42 UTC on
29 October, while Plausible recorded no submission after the 14:55:29 UTC
deployment, even without a variant filter. Its missing event's cause and
headline could not be established. Keep that entry unattributed. Saved
attribution was added on launch day, before the full comparison window.

Run all three versions concurrently with the same campaigns. Check source, country and
device splits for gross imbalance, and the error rate for a broken form. Keep
copy and targeting stable during the comparison. Do not select a winner from
one day's few submissions or keep stopping whenever one version happens to
lead. Review the fixed two-week window above; conclude inconclusive if the
evidence is sparse, and plan any further window before collecting its data.
Repeated visitors,
ad-blocking, spam and the page-load assignment limit statistical independence
and interpretation. This is an initial directional test, not a claim of proven
visitor-level uplift. Log launch/end dates and any interruptions here.

The retired `hero-hook-v1` keeps its own Plausible filter and saved signup
labels. Its admin cohort has an exclusive end time at the configured v2
start, so new unattributed entries do not also increase its historic report.
Confirmations still update people who signed up inside that earlier cohort.
Leave `hook-test.js` available for cached old pages. Do not combine v1 and v2
traffic or claim the preliminary two-way test established a winner.

To end v2, put the selected complete page in the HTML, remove the other
treatments, assignment script and customProperties/transformRequest config,
and simplify the variant CSS. Do not reuse `homepage-v2` for another change.
The default without the assignment script remains B.
