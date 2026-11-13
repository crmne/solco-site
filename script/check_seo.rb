# frozen_string_literal: true

# Checks the pages in site/ for what search engines and link previews read:
# one title, description and canonical per indexable page, one h1, alt text on
# every image, valid JSON-LD, a sitemap that lists exactly the indexable pages
# with a lastmod each, clean URLs (no ".html" in canonicals, Open Graph URLs,
# structured data, the sitemap, llms.txt or internal links), and, on every
# page with questions, a FAQPage block that says what the visible questions
# say, and the home page's offers are complete, with no ratings anywhere.
#
#   ruby script/check_seo.rb           # check, exit 1 on a problem
#   ruby script/check_seo.rb --write   # rewrite each page's FAQPage block from its FAQ first
#
# Plain Ruby, no gems: the pages are hand-written, so patterns are enough.

require "json"
require "cgi"

SITE = File.expand_path("../site", __dir__)
ORIGIN = "https://getsolco.com"
problems = []

def text_of(html)
  CGI.unescapeHTML(html.gsub(/<[^>]+>/, "")).gsub(/\s+/, " ").strip
end

# The visible FAQ: each <details> in the FAQ section, its answer without the
# help-centre link at the end.
def faq_entries(html)
  section = html[%r{<section class="faq".*?</section>}m] or return []
  section.scan(%r{<details><summary>(.*?)</summary><p>(.*?)</p></details>}m).map do |q, a|
    [text_of(q), text_of(a.sub(%r{<a class="faq-more".*?</a>}m, ""))]
  end
end

def faq_block(entries, url = "#{ORIGIN}/")
  data = {
    "@context" => "https://schema.org",
    "@type" => "FAQPage",
    "@id" => "#{url}#faq",
    "mainEntity" => entries.map do |q, a|
      { "@type" => "Question", "name" => q, "acceptedAnswer" => { "@type" => "Answer", "text" => a } }
    end
  }
  %(<script type="application/ld+json" id="ld-faq">\n#{JSON.pretty_generate(data)}\n</script>)
end

FAQ_BLOCK = %r{<script type="application/ld\+json" id="ld-faq">.*?</script>}m
pages = Dir.glob("**/*.html", base: SITE).sort
# GitHub Pages serves name.html at /name, so that is the URL every page uses;
# name.html still answers, says /name is canonical and shows /name in the
# address bar (CLEAN_ADDRESS).
url_of = ->(rel) { "#{ORIGIN}/#{rel.sub(/(\A|\/)index\.html\z/, '\1').delete_suffix('.html')}" }
CLEAN_ADDRESS = '<script>if(/\.html$/.test(location.pathname))history.replaceState(null,"",' \
                'location.pathname.replace(/(index)?\.html$/,"")+location.search+location.hash)</script>'

if ARGV.include?("--write")
  pages.each do |rel|
    path = File.join(SITE, rel)
    html = File.read(path)
    next unless html.match?(FAQ_BLOCK)

    File.write(path, html.sub(FAQ_BLOCK) { faq_block(faq_entries(html), url_of.(rel)) })
  end
end

indexable = []

pages.each do |rel|
  html = File.read(File.join(SITE, rel))
  noindex = html.match?(/<meta name="robots" content="[^"]*noindex/)
  url = url_of.(rel)
  indexable << url unless noindex

  titles = html.scan(%r{<title>(.*?)</title>}m).flatten
  problems << "#{rel}: #{titles.size} titles" unless titles.size == 1
  problems << "#{rel}: title is #{titles.first.size} characters (keep it to 65)" if titles.first && titles.first.size > 65 && !noindex
  h1s = html.scan(/<h1[\s>]/).size
  problems << "#{rel}: #{h1s} h1 elements" unless h1s == 1

  html.scan(/<img\b[^>]*>/).each do |img|
    problems << "#{rel}: an image without alt: #{img[0, 90]}" unless img.match?(/\salt="/)
  end

  html.scan(%r{<script type="application/ld\+json"[^>]*>(.*?)</script>}m).flatten.each do |json|
    JSON.parse(json)
  rescue JSON::ParserError => e
    problems << "#{rel}: JSON-LD doesn't parse: #{e.message[0, 120]}"
  end

  html.scan(/\b(?:href|src|content)="([^"]*)"/).flatten.each do |link|
    next if link.match?(%r{\A(?:[a-z]+:)?//}) && !link.start_with?(ORIGIN)
    problems << "#{rel}: links #{link}, use the URL without .html" if link.match?(/\.html(?:[#?]|\z)/)
  end
  html.scan(%r{<script type="application/ld\+json"[^>]*>(.*?)</script>}m).flatten.each do |json|
    json.scan(%r{https://getsolco\.com/[^"]*\.html\b}).uniq.each { |u| problems << "#{rel}: structured data names #{u}" }
  end
  next if noindex

  problems << "#{rel}: no address-bar cleanup script (CLEAN_ADDRESS)" unless html.include?(CLEAN_ADDRESS)
  og_url = html[/<meta property="og:url" content="([^"]*)"/, 1]
  problems << "#{rel}: og:url is #{og_url.inspect}, expected #{url}" unless og_url.nil? || og_url == url

  desc = html[/<meta name="description" content="([^"]*)"/, 1]
  if desc.nil? then problems << "#{rel}: no meta description"
  elsif desc.size > 160 then problems << "#{rel}: description is #{desc.size} characters (keep it to 160)"
  end
  canonical = html[/<link rel="canonical" href="([^"]*)"/, 1]
  problems << "#{rel}: canonical is #{canonical.inspect}, expected #{url}" unless canonical == url
end

faq_count = 0
pages.each do |rel|
  html = File.read(File.join(SITE, rel))
  block = html[FAQ_BLOCK]
  entries = faq_entries(html)
  if block.nil?
    problems << "#{rel}: questions without a FAQPage block (ld-faq)" if entries.any? || rel == "index.html"
  elsif entries.empty?
    problems << "#{rel}: a FAQPage block without visible questions"
  elsif block != faq_block(entries, url_of.(rel))
    problems << "#{rel}: the FAQPage block doesn't match the visible FAQ (run with --write)"
  end
  faq_count += entries.size if block
end

# The home page's SoftwareApplication says what a visitor can get today (docs/seo.md):
# at least one Offer, each with a price, currency, availability and a URL on
# this site, and no ratings or reviews on any page.
home_ld = File.read(File.join(SITE, "index.html")).scan(%r{<script type="application/ld\+json"[^>]*>(.*?)</script>}m).flatten
app = home_ld.flat_map { |j| (d = JSON.parse(j) rescue {}); d["@graph"] || [d] }.find { |n| n["@type"] == "SoftwareApplication" }
if app.nil? then problems << "index.html: no SoftwareApplication"
else
  offers = app["offers"].is_a?(Hash) ? [app["offers"]] : Array(app["offers"])
  problems << "index.html: SoftwareApplication has no offers" if offers.empty?
  offers.each do |o|
    missing = %w[price priceCurrency availability url].reject { |k| o[k].to_s != "" }
    problems << "index.html: an offer without #{missing.join(', ')}" if missing.any?
    problems << "index.html: offer URL #{o['url']} isn't on #{ORIGIN}" unless o["url"].to_s.start_with?("#{ORIGIN}/")
    problems << "index.html: offer price #{o['price'].inspect} isn't a number" unless o["price"].to_s.match?(/\A\d+(\.\d+)?\z/)
  end
end
pages.each do |rel|
  problems << "#{rel}: structured data has ratings or reviews" if File.read(File.join(SITE, rel)).match?(/"(aggregateRating|review|reviewRating)"/)
end

sitemap_xml = File.read(File.join(SITE, "sitemap.xml"))
sitemap = sitemap_xml.scan(%r{<loc>(.*?)</loc>}).flatten
sitemap_xml.scan(%r{<url>(.*?)</url>}m).flatten.each do |entry|
  problems << "sitemap.xml: no lastmod for #{entry[/<loc>(.*?)</, 1]}" unless entry.match?(%r{<lastmod>\d{4}-\d{2}-\d{2}</lastmod>})
end
File.read(File.join(SITE, "llms.txt")).scan(%r{https://getsolco\.com/\S*?\.html\b}).each do |u|
  problems << "llms.txt: names #{u}, use the URL without .html"
end
(indexable - sitemap).each { |u| problems << "sitemap.xml: missing #{u}" }
(sitemap - indexable).each { |u| problems << "sitemap.xml: lists #{u}, which isn't an indexable page" }

if problems.empty?
  puts "SEO checks passed: #{pages.size} pages, #{sitemap.size} in the sitemap, #{faq_count} FAQ entries."
else
  warn problems.map { |p| "- #{p}" }
  exit 1
end
