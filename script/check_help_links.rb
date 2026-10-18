# frozen_string_literal: true

# Checks every link from the site to a help center article.
#
# The articles live in the Solco repository, in docs/help-center/, one
# Markdown file per article: the file name with a `solco-` prefix is the
# slug, and the front matter holds the title. With that folder at hand
# (SOLCO_HELP_CENTER, or ../solco/docs/help-center beside this repository),
# every linked slug must be an article, every article title written next to
# its link in llms.txt must match the front matter, and llms.txt must list
# every article. Without it, as in CI, each linked article must load from
# support.getsolco.com. `--live` checks the portal as well.
#
#   ruby script/check_help_links.rb [--live]
#   ruby script/check_help_links.rb --llms   # prints llms.txt's article list

require "net/http"
require "uri"
require "yaml"

ROOT = File.expand_path("..", __dir__)
SITE = File.join(ROOT, "site")
ARTICLE_URL = %r{https://support\.getsolco\.com/hc/solco/articles/([a-z0-9-]+)}
ARTICLE_BASE = "https://support.getsolco.com/hc/solco/articles/"

def articles(folder)
  Dir[File.join(folder, "*.md")].reject { |path| File.basename(path) == "README.md" }.to_h do |path|
    front = File.read(path)[/\A---\n(.*?)\n---\n/m, 1] or abort "#{path}: no front matter"
    meta = YAML.safe_load(front)
    ["solco-#{File.basename(path, ".md")}", meta]
  end
end

def links
  Dir[File.join(SITE, "**", "*.{html,txt,xml}")].sort.flat_map do |path|
    File.read(path).scan(ARTICLE_URL).flatten.map { |slug| [path.delete_prefix("#{ROOT}/"), slug] }
  end
end

def loads?(url)
  5.times do
    response = Net::HTTP.get_response(URI(url))
    return true if response.is_a?(Net::HTTPSuccess)
    return false unless response.is_a?(Net::HTTPRedirection)

    url = URI.join(url, response["location"]).to_s
  end
  false
end

folder = ENV.fetch("SOLCO_HELP_CENTER", File.expand_path("../solco/docs/help-center", ROOT))
known = articles(folder) if Dir.exist?(folder)

if ARGV.include?("--llms")
  abort "No help center articles at #{folder}" unless known
  known.sort_by { |_, meta| [meta["category"].to_s, meta["position"].to_i] }.each do |slug, meta|
    puts "- [#{meta["title"]}](#{ARTICLE_BASE}#{slug}): #{meta["description"]}"
  end
  exit
end

errors = []
found = links
errors << "No help center article links found under site/" if found.empty?

sitemap = File.read(File.join(SITE, "sitemap.xml"))
errors << "site/sitemap.xml lists the help center, which is not this site" if sitemap.include?("support.getsolco.com")

if known
  found.each do |file, slug|
    errors << "#{file}: #{slug} is not an article in #{folder}" unless known.key?(slug)
  end
  llms = File.read(File.join(SITE, "llms.txt"))
  listed = llms.scan(/\[([^\]]+)\]\(#{ARTICLE_URL}\)/)
  listed.each do |title, slug|
    next unless known.key?(slug)

    expected = known[slug]["title"]
    errors << "site/llms.txt: #{slug} is titled #{expected.inspect}, not #{title.inspect}" unless title == expected
  end
  (known.keys - listed.map(&:last)).each { |slug| errors << "site/llms.txt does not list #{slug}" }
end

if !known || ARGV.include?("--live")
  found.map(&:last).uniq.each do |slug|
    errors << "#{ARTICLE_BASE}#{slug} does not load" unless loads?("#{ARTICLE_BASE}#{slug}")
  end
end

if errors.empty?
  source = known ? "#{known.size} articles in #{folder}" : "support.getsolco.com"
  puts "#{found.size} help center links checked against #{source}"
else
  warn errors
  exit 1
end
