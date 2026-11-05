# frozen_string_literal: true

# Checks the pages in site/ for what search engines and link previews read:
# one title, description and canonical per indexable page, one h1, alt text on
# every image, valid JSON-LD, a sitemap that lists exactly the indexable pages,
# and, on every page with questions, a FAQPage block that says what the
# visible questions say.
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
url_of = ->(rel) { "#{ORIGIN}/#{rel.sub(/(\A|\/)index\.html\z/, '\1')}" }

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

  next if noindex

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

sitemap = File.read(File.join(SITE, "sitemap.xml")).scan(%r{<loc>(.*?)</loc>}).flatten
(indexable - sitemap).each { |u| problems << "sitemap.xml: missing #{u}" }
(sitemap - indexable).each { |u| problems << "sitemap.xml: lists #{u}, which isn't an indexable page" }

if problems.empty?
  puts "SEO checks passed: #{pages.size} pages, #{sitemap.size} in the sitemap, #{faq_count} FAQ entries."
else
  warn problems.map { |p| "- #{p}" }
  exit 1
end
