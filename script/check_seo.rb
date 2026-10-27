# frozen_string_literal: true

# Checks the pages in site/ for what search engines and link previews read:
# one title, description and canonical per indexable page, one h1, alt text on
# every image, valid JSON-LD, a sitemap that lists exactly the indexable pages,
# and a FAQPage block that says what the visible questions say.
#
#   ruby script/check_seo.rb           # check, exit 1 on a problem
#   ruby script/check_seo.rb --write   # rewrite index.html's FAQPage block from its FAQ first
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

def faq_block(entries)
  data = {
    "@context" => "https://schema.org",
    "@type" => "FAQPage",
    "@id" => "#{ORIGIN}/#faq",
    "mainEntity" => entries.map do |q, a|
      { "@type" => "Question", "name" => q, "acceptedAnswer" => { "@type" => "Answer", "text" => a } }
    end
  }
  %(<script type="application/ld+json" id="ld-faq">\n#{JSON.pretty_generate(data)}\n</script>)
end

FAQ_BLOCK = %r{<script type="application/ld\+json" id="ld-faq">.*?</script>}m
index_path = File.join(SITE, "index.html")

if ARGV.include?("--write")
  html = File.read(index_path)
  abort "index.html has no ld-faq block" unless html.match?(FAQ_BLOCK)
  File.write(index_path, html.sub(FAQ_BLOCK) { faq_block(faq_entries(html)) })
end

pages = Dir.glob("**/*.html", base: SITE).sort
indexable = []

pages.each do |rel|
  html = File.read(File.join(SITE, rel))
  noindex = html.match?(/<meta name="robots" content="[^"]*noindex/)
  url = "#{ORIGIN}/#{rel.sub(/(\A|\/)index\.html\z/, '\1')}"
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

index = File.read(index_path)
block = index[FAQ_BLOCK]
if block.nil?
  problems << "index.html: no FAQPage block (ld-faq)"
elsif block != faq_block(faq_entries(index))
  problems << "index.html: the FAQPage block doesn't match the visible FAQ (run with --write)"
end

sitemap = File.read(File.join(SITE, "sitemap.xml")).scan(%r{<loc>(.*?)</loc>}).flatten
(indexable - sitemap).each { |u| problems << "sitemap.xml: missing #{u}" }
(sitemap - indexable).each { |u| problems << "sitemap.xml: lists #{u}, which isn't an indexable page" }

if problems.empty?
  puts "SEO checks passed: #{pages.size} pages, #{sitemap.size} in the sitemap, #{faq_entries(index).size} FAQ entries."
else
  warn problems.map { |p| "- #{p}" }
  exit 1
end
