// The buy page. The server decides everything that matters: whether Solco is on
// sale, every price, the VAT. This only shows its answers. A key in the address
// (#renew=SOLA1...) never leaves the page in the address: it moves into the form
// and off the address bar at once. No analytics load on this page.
(() => {
  const API = location.hostname === "localhost" ? "http://localhost:3999" : "https://api.getsolco.com"
  const $ = (selector, root = document) => root.querySelector(selector)
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]
  const COUNTRIES = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ")

  const money = (cents, currency) => new Intl.NumberFormat("en-GB", { style: "currency", currency: currency.toUpperCase(), currencyDisplay: "narrowSymbol", minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100)

  async function post(path, body) {
    let response
    try {
      response = await fetch(`${API}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    } catch {
      throw new Error("We couldn't reach Solco. Check your connection and try again.")
    }
    const answer = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(answer.error?.message || "That didn't work. Try again in a moment.")
    return answer
  }

  const details = $("#details")
  const review = $("#review")
  let quote

  function showProblem(form, error) {
    const problem = $(".problem", form)
    problem.textContent = error ? error.message : ""
    problem.hidden = !error
  }

  function order() {
    const data = Object.fromEntries(new FormData(details))
    const body = { kind: data.kind }
    for (const field of ["name", "address_line1", "address_line2", "postal_code", "city", "region", "country", "vat_id", "business_evidence"]) {
      if (data[field]?.trim()) body[field] = data[field].trim()
    }
    if (data.business_declared) body.business_declared = true
    if (data.kind === "renewal") body.licence_key = data.licence_key.trim()
    else body.email = data.email.trim()
    return body
  }

  function showKind(kind) {
    $$("[data-for]", details).forEach((field) => { field.hidden = field.dataset.for !== kind })
  }

  function showReview() {
    const name = quote.kind === "renewal" ? "Solco renewal, 12 more months" : "Solco licence, with 12 months of updates and the assistant"
    $('[data-q="item"]').textContent = quote.offer === "launch" ? `${name} (launch price)` : name
    $('[data-q="total"]').textContent = money(quote.amount_cents, quote.currency)
    $('[data-q="net"]').textContent = money(quote.net_cents, quote.currency)
    $('[data-q="vat"]').textContent = money(quote.vat_cents, quote.currency)
    $('[data-q="vat-label"]').textContent = quote.vat_label
    $('[data-q-row="net"]').hidden = $('[data-q-row="vat"]').hidden = quote.vat_cents === 0
    $('[data-q="note"]').textContent = quote.vat_cents === 0 ? quote.vat_label + "." : ""
    const data = order()
    $('[data-q="buyer"]').textContent = [data.name, data.city, new Intl.DisplayNames(["en-GB"], { type: "region" }).of(data.country)].join(", ")
    $('[data-q-row="consent"]').hidden = !quote.consumer
    $('[data-q="consent"]').textContent = quote.consent_text || ""
    $('input[name="consent"]', review).checked = false
    // § 312j(3) BGB: a consumer's own order button says what it does.
    $('[data-q="button"]').textContent = quote.consumer ? "Order with obligation to pay" : "Continue to payment"
    details.hidden = true
    review.hidden = false
    review.scrollIntoView({ block: "start" })
  }

  details.addEventListener("change", (event) => { if (event.target.name === "kind") showKind(event.target.value) })

  details.addEventListener("submit", async (event) => {
    event.preventDefault()
    showProblem(details)
    const button = $("button[type=submit]", details)
    button.disabled = true
    try {
      quote = await post("/v1/billing/quote", order())
      showReview()
    } catch (error) {
      showProblem(details, error)
    } finally {
      button.disabled = false
    }
  })

  review.addEventListener("submit", async (event) => {
    event.preventDefault()
    showProblem(review)
    const consent = $('input[name="consent"]', review).checked
    if (quote.consumer && !consent) return showProblem(review, new Error("Tick the box above the order button to go on."))
    const button = $("button[type=submit]", review)
    button.disabled = true
    try {
      const answer = await post("/v1/billing/checkout", { ...order(), consent: quote.consumer ? consent : undefined, contract_version: quote.contract_version })
      location.assign(answer.url)
    } catch (error) {
      showProblem(review, error)
      button.disabled = false
    }
  })

  $("[data-back]").addEventListener("click", () => {
    review.hidden = true
    details.hidden = false
  })

  function takeKeyFromAddress() {
    const match = location.hash.match(/^#renew(?:=(.+))?$/)
    if (!match) return
    $('input[name="kind"][value="renewal"]').checked = true
    if (match[1]) $('textarea[name="licence_key"]').value = decodeURIComponent(match[1])
    history.replaceState(null, "", location.pathname)
    showKind("renewal")
  }

  async function open() {
    takeKeyFromAddress()
    const countries = new Intl.DisplayNames(["en-GB"], { type: "region" })
    const select = $('select[name="country"]')
    select.append(new Option("Choose", ""), ...COUNTRIES.map((code) => [countries.of(code), code]).sort((a, b) => a[0].localeCompare(b[0], "en-GB")).map(([name, code]) => new Option(name, code)))
    select.options[0].disabled = true

    let offer
    try {
      offer = await (await fetch(`${API}/v1/billing/offer`)).json()
    } catch {
      return // The closed page stands.
    }
    if (!offer.selling) return
    for (const [name, amounts] of Object.entries(offer.offers)) {
      $$(`[data-price="${name}-eur"]`).forEach((element) => { element.textContent = money(amounts.eur_cents, "eur") })
      $$(`[data-price="${name}-usd"]`).forEach((element) => { element.textContent = money(amounts.usd_cents, "usd") })
    }
    $("[data-launch]").hidden = !offer.launch
    $('[data-state="closed"]').hidden = true
    $('[data-state="open"]').hidden = false
  }

  open()
})()
