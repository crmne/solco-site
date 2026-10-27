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
| `Waitlist: CTA click` | A "Join the waitlist" link or button that scrolls to the form | `place`: `topbar`, `grids`, `payoff`, `final` |
| `Waitlist: Started` | The first letter typed into the email field, once per page | |
| `Waitlist: Questions shown` | A valid address sent, step two (the four questions) shown | |
| `Waitlist: Submitted` | The waitlist accepted the form | `answers`: `answered` or `skipped`; `referral`: `yes` or `no`; `form`: `hosted` when it came from the waitlist's own page |
| `Waitlist: Error` | The address was refused, or the request failed | `status`: `invalid email`, an HTTP status, or `network` |
| `Waitlist: Confirmed` | The confirmation page on waitlist.plenty.is | `referral`: `yes` or `no` |
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
`form` (and `url`, which Plausible adds to outbound clicks and downloads).
All are listed.

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
