// The thanks page asks the server how the order stands, and says only that;
// the withdrawal page sends its form. Nothing here claims a payment by itself.
(() => {
  const API = location.hostname === "localhost" ? "http://localhost:3999" : "https://api.getsolco.com"
  const post = (path, body) => fetch(`${API}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })

  const title = document.querySelector('[data-thanks="title"]')
  if (title) {
    const text = document.querySelector('[data-thanks="text"]')
    const reference = new URLSearchParams(location.search).get("order")
    history.replaceState(null, "", location.pathname)
    let tries = 0
    const check = async () => {
      let state
      try {
        const response = await post("/v1/billing/order", { reference })
        state = response.ok ? (await response.json()).state : null
      } catch { state = null }
      if (state === "paid") {
        title.textContent = "Thank you"
        text.textContent = "Your payment went through. Your licence key is on its way by email, with your receipt to follow."
      } else if (state === "waiting" && ++tries < 30) {
        setTimeout(check, 2000)
      } else {
        title.textContent = "Thank you"
        text.textContent = "We're still waiting to hear about your payment. Your email will say as soon as it's through. If nothing arrives, write to hello@getsolco.com."
      }
    }
    check()
  }

  const form = document.getElementById("withdraw")
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault()
      const problem = form.querySelector(".problem")
      problem.hidden = true
      const data = Object.fromEntries(new FormData(form))
      try {
        const response = await post("/v1/billing/withdrawal", { reference: data.reference.trim().toLowerCase(), email: data.email.trim() })
        const answer = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(answer.error?.message || "That didn't work. Write to hello@getsolco.com and we'll help.")
        form.hidden = true
        document.querySelector(".done").hidden = false
      } catch (error) {
        problem.textContent = error.message
        problem.hidden = false
      }
    })
  }
})()
