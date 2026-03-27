(function() {

const FEEDS = [
  { url: "https://www.multifamilydive.com/feeds/news.rss",             name: "MultifamilyDive" },
  { url: "https://www.globest.com/rss/?section=Multifamily",           name: "GlobeSt" },
  { url: "https://www.multihousingnews.com/feed/",                     name: "Multi-Housing News" },
  { url: "https://www.multifamilyexecutive.com/rss",                   name: "Multifamily Executive" },
  { url: "https://www.realpage.com/analytics/feed/",                   name: "RealPage" },
  { url: "https://www.rentcafe.com/blog/feed/",                        name: "RentCafe" },
  { url: "https://www.nmhc.org/rss/news/",                             name: "NMHC" },
  { url: "https://www.apartments.com/blog/feed",                       name: "Apartments.com" },
  { url: "https://yieldpro.com/feed/",                                 name: "YieldPro" },
  { url: "https://www.housingwire.com/feed/",                          name: "HousingWire" },
  { url: "https://www.housingwire.com/category/housing-finance/feed/", name: "HousingWire Economics" },
  { url: "https://jayparsons.beehiiv.com/feed",                        name: "Jay Parsons" },
  { url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",              name: "WSJ" },
  { url: "https://feeds.bloomberg.com/markets/news.rss",               name: "Bloomberg" },
  { url: "https://www.marketwatch.com/rss/topstories",                 name: "MarketWatch" },
  { url: "https://feeds.reuters.com/reuters/businessNews",             name: "Reuters" },
  { url: "https://www.ft.com/?format=rss",                             name: "Financial Times" },
  { url: "https://www.nmhc.org/rss/research/",                         name: "NMHC Research" },
  { url: "https://rebusinessonline.com/feed/",                         name: "REBusiness Online" },
];

const RSS2JSON = "https://api.rss2json.com/v1/api.json?rss_url=";

// To use AI scoring, paste your Anthropic API key here:
const ANTHROPIC_API_KEY = "";

const MARKETS = {
  "phoenix":        { label:"Phoenix",         keywords:["phoenix","scottsdale","tempe","mesa","chandler","maricopa"] },
  "san-antonio":    { label:"San Antonio",      keywords:["san antonio"] },
  "kansas-city":    { label:"Kansas City",      keywords:["kansas city"] },
  "columbus":       { label:"Columbus",         keywords:["columbus, oh","columbus ohio"] },
  "nashville":      { label:"Nashville",        keywords:["nashville","brentwood, tn","murfreesboro"] },
  "austin":         { label:"Austin",           keywords:["austin, tx","austin texas"] },
  "dallas":         { label:"Dallas",           keywords:["dallas","fort worth","dfw","plano","frisco"] },
  "charlotte":      { label:"Charlotte",        keywords:["charlotte, nc","charlotte north carolina"] },
  "indianapolis":   { label:"Indianapolis",     keywords:["indianapolis","indy, in"] },
  "denver":         { label:"Denver",           keywords:["denver","aurora, co","boulder, co"] },
  "atlanta":        { label:"Atlanta",          keywords:["atlanta","buckhead","alpharetta"] },
  "tampa":          { label:"Tampa",            keywords:["tampa","st. pete","sarasota"] },
  "houston":        { label:"Houston",          keywords:["houston","woodlands, tx","sugar land"] },
  "raleigh":        { label:"Raleigh",          keywords:["raleigh","durham","research triangle"] },
  "orlando":        { label:"Orlando",          keywords:["orlando","kissimmee","lake nona"] },
  "chicago":        { label:"Chicago",          keywords:["chicago","cook county","evanston"] },
  "minneapolis":    { label:"Minneapolis",      keywords:["minneapolis","st. paul","twin cities"] },
  "st-louis":       { label:"St. Louis",        keywords:["st. louis","saint louis"] },
  "springfield-mo": { label:"Springfield, MO",  keywords:["springfield, mo","springfield missouri"] },
  "nixa-mo":        { label:"Nixa, MO",         keywords:["nixa, mo","nixa missouri","nixa"] },
};

const REGIONS = {
  "sunbelt":       { label:"Sunbelt",       markets:["phoenix","austin","tampa","orlando"] },
  "texas":         { label:"Texas",         markets:["dallas","san-antonio","houston","austin"] },
  "southeast":     { label:"Southeast",     markets:["nashville","atlanta","charlotte","raleigh"] },
  "plains":        { label:"Plains",        markets:["kansas-city","springfield-mo","nixa-mo","st-louis"] },
  "midwest":       { label:"Midwest",       markets:["st-louis","minneapolis"] },
  "great-lakes":   { label:"Great Lakes",   markets:["columbus","indianapolis","chicago"] },
  "mountain-west": { label:"Mountain West", markets:["denver"] },
  "northeast":     { label:"Northeast",     markets:[] },
  "west":          { label:"West Coast",    markets:[] },
};

// Build reverse region lookup
const MARKET_TO_REGION = {};
Object.entries(REGIONS).forEach(([rk, rv]) => rv.markets.forEach(m => { MARKET_TO_REGION[m] = rk; }));

const DEAL_SIGNALS = ["acquires","acquired","acquisition","sells","sold","closes","closed","transaction","purchase","purchased","joint venture","financing","refinanc","loan","equity raise","recapitalization","disposition","trades","traded","sale leaseback","breaks ground","groundbreaking","partnership","fund launch","portfolio sale","jv partner","names ceo","names president","promotes","appoints","hires","joins as","welcomes","expands into","opens office","capital raise","raises fund","secures","awarded contract","wins bid","ipo","goes public","merger","merges"];
const STAT_SIGNALS = ["vacancy","occupancy","rent growth","absorption","deliveries","cap rate","basis points","bps","noi","supply pipeline","completions","yoy","year-over-year","percent","%","units delivered","asking rent","effective rent","lease-up","median rent","average rent","inventory","market rate","rent index"];

function getCandidateMarkets(title, summary) {
  const text = (title + " " + summary).toLowerCase();
  return Object.entries(MARKETS)
    .filter(([, v]) => v.keywords.some(k => text.includes(k)))
    .map(([k]) => k);
}

function hasDealSignal(title, summary) {
  const text = (title + " " + summary).toLowerCase();
  return DEAL_SIGNALS.some(s => text.includes(s));
}

function hasStatSignal(title, summary) {
  const text = (title + " " + summary).toLowerCase();
  return STAT_SIGNALS.some(s => text.includes(s));
}

function getTopicType(title, summary, source) {
  const text = (title + " " + summary + " " + source).toLowerCase();
  const ecoKw = ["fed","federal reserve","fomc","interest rate","treasury","gdp","inflation","cpi","jobs report","labor market","unemployment","tariff","consumer spending","recession","monetary policy","rate cut","rate hike","10-year yield","mortgage rate","fiscal","bloomberg","reuters","wsj","financial times","marketwatch","housingwire economics"];
  const mfKw = ["multifamily","apartment","renter","rental","vacancy","occupancy","cap rate","absorption","lease","workforce housing","affordable housing","btr","build-to-rent","rent growth","supply pipeline","multifamilydive","nmhc","realpage","rentcafe","yieldpro","multifamily executive"];
  let eco = 0, mf = 0;
  ecoKw.forEach(k => { if (text.includes(k)) eco++; });
  mfKw.forEach(k => { if (text.includes(k)) mf++; });
  return eco > mf ? "economic" : "multifamily";
}

async function scoreMarketsWithAI(title, summary, candidateMarkets) {
  if (!ANTHROPIC_API_KEY || !candidateMarkets.length) return {};
  const marketLabels = candidateMarkets.map(m => MARKETS[m].label).join(", ");
  const prompt = `You are a commercial real estate analyst reviewing a news article.

Article title: "${title}"
Article summary: "${summary}"

Markets mentioned: ${marketLabels}

For each market, score its relevance to this article from 0-100 using these rules:
- Score 80-100: The article is primarily focused on this market AND contains real data or statistics (vacancy rates, rent growth, absorption, cap rates, supply numbers, occupancy, etc.)
- Score 40-79: The market is mentioned with some context but is not the primary focus, or data is limited
- Score 0-39: The market is only briefly mentioned in a list, or the article is primarily about a deal/transaction/acquisition rather than market data

Also determine: does this article primarily report a deal, acquisition, sale, or financing transaction? Answer yes or no.

Respond ONLY with valid JSON in this exact format:
{"deal": false, "scores": {"Phoenix": 85, "Kansas City": 20}}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch(e) {
    return {};
  }
}

async function tagArticle(title, summary, source) {
  const type = getTopicType(title, summary, source);
  const candidateMarkets = getCandidateMarkets(title, summary);

  if (!candidateMarkets.length) {
    return { type, markets: [], regions: [], geo: "national" };
  }

  // AI scoring path
  if (ANTHROPIC_API_KEY) {
    const result = await scoreMarketsWithAI(title, summary, candidateMarkets);
    if (result.deal === true) {
      return { type, markets: [], regions: [], geo: "national" };
    }
    const scores = result.scores || {};
    const qualifiedMarkets = candidateMarkets.filter(m => {
      const label = MARKETS[m].label;
      return (scores[label] || 0) >= 70;
    });
    if (!qualifiedMarkets.length) {
      return { type, markets: [], regions: [], geo: "national" };
    }
    const regions = [...new Set(qualifiedMarkets.map(m => MARKET_TO_REGION[m]).filter(Boolean))];
    return { type, markets: qualifiedMarkets, regions, geo: "market" };
  }

  // Fallback: keyword rules only
  if (!hasStatSignal(title, summary)) {
    return { type, markets: [], regions: [], geo: "national" };
  }
  const regions = [...new Set(candidateMarkets.map(m => MARKET_TO_REGION[m]).filter(Boolean))];
  return { type, markets: candidateMarkets, regions, geo: candidateMarkets.length ? "market" : "national" };
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 3600) return Math.round(diff / 60) + "m ago";
  if (diff < 86400) return Math.round(diff / 3600) + "h ago";
  return Math.round(diff / 86400) + "d ago";
}

const CSS = `
#cre-feed-root*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;}
#cre-feed-root{padding:1.5rem 0;color:#111;}
.cre-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;flex-wrap:wrap;gap:8px;}
.cre-brand{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#888;}
.cre-live{display:flex;align-items:center;gap:6px;font-size:12px;color:#3B6D11;font-weight:500;}
.cre-dot{width:7px;height:7px;border-radius:50%;background:#3B6D11;animation:cre-pulse 2s infinite;}
@keyframes cre-pulse{0%,100%{opacity:1}50%{opacity:.3}}
.cre-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:1.5rem;}
.cre-stat{background:#f5f5f3;border-radius:8px;padding:10px 12px;}
.cre-stat-label{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px;}
.cre-stat-val{font-size:20px;font-weight:500;color:#111;}
.cre-stat-val.sm{font-size:12px;padding-top:4px;}
.cre-flabel{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px;}
.cre-fblock{margin-bottom:1.1rem;}
.cre-segs{display:flex;gap:6px;flex-wrap:wrap;}
.cre-seg{font-size:13px;padding:6px 15px;border-radius:20px;border:1px solid #ddd;background:#fff;color:#666;cursor:pointer;transition:all .15s;user-select:none;}
.cre-seg:hover{background:#f5f5f3;}
.cre-seg.at{background:#E6F1FB;border-color:#85B7EB;color:#185FA5;font-weight:500;}
.cre-seg.ag{background:#E1F5EE;border-color:#5DCAA5;color:#0F6E56;font-weight:500;}
.cre-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px;}
.cre-pill{font-size:11px;padding:4px 11px;border-radius:20px;border:1px solid #ddd;background:#fff;color:#666;cursor:pointer;transition:all .15s;user-select:none;}
.cre-pill:hover{background:#f5f5f3;}
.cre-pill.ar{background:#E1F5EE;border-color:#5DCAA5;color:#0F6E56;font-weight:500;}
.cre-pill.am{background:#EEEDFE;border-color:#AFA9EC;color:#534AB7;font-weight:500;}
.cre-search-row{display:flex;gap:8px;margin:1rem 0 1.25rem;}
.cre-search-row input{flex:1;font-size:13px;padding:8px 12px;border-radius:8px;border:1px solid #ddd;background:#fff;color:#111;outline:none;}
.cre-search-row input:focus{border-color:#85B7EB;}
.cre-btn{font-size:12px;padding:8px 13px;border-radius:8px;border:1px solid #ddd;background:#fff;color:#666;cursor:pointer;}
.cre-btn:hover{background:#f5f5f3;}
.cre-chips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:.75rem;}
.cre-chip{font-size:11px;padding:3px 8px 3px 10px;border-radius:20px;background:#f5f5f3;color:#666;border:1px solid #ddd;display:flex;align-items:center;gap:4px;cursor:pointer;}
.cre-chip:hover{color:#111;}
.cre-rlabel{font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px;}
.cre-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:11px;}
.cre-card{background:#fff;border:1px solid #eee;border-radius:12px;padding:.9rem 1.1rem;display:flex;flex-direction:column;gap:7px;cursor:pointer;transition:border-color .15s;text-decoration:none;color:inherit;}
.cre-card:hover{border-color:#ccc;}
.cre-card-top{display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;}
.cre-source{font-size:11px;font-weight:500;color:#555;}
.cre-time{font-size:11px;color:#aaa;}
.cre-title{font-size:13px;font-weight:500;color:#111;line-height:1.45;}
.cre-summary{font-size:12px;color:#666;line-height:1.5;}
.cre-tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:1px;}
.cre-tag{font-size:10px;padding:2px 6px;border-radius:4px;}
.cre-tag-eco{background:#FAEEDA;color:#854F0B;}
.cre-tag-mf{background:#E1F5EE;color:#085041;}
.cre-tag-nat{background:#F1EFE8;color:#5F5E5A;}
.cre-tag-reg{background:#E1F5EE;color:#0F6E56;}
.cre-tag-mkt{background:#EEEDFE;color:#534AB7;}
.cre-ai-badge{font-size:9px;padding:2px 6px;border-radius:4px;background:#EEEDFE;color:#534AB7;margin-left:auto;}
.cre-empty{grid-column:1/-1;text-align:center;padding:2.5rem;color:#aaa;font-size:13px;}
.cre-loading{grid-column:1/-1;text-align:center;padding:2.5rem;color:#aaa;font-size:13px;}
.cre-progress{width:100%;height:3px;background:#f0f0f0;border-radius:2px;margin-bottom:1rem;overflow:hidden;}
.cre-progress-bar{height:100%;background:#85B7EB;border-radius:2px;transition:width .3s;}
`;

function buildHTML() {
  const marketPills = Object.entries(MARKETS).map(([k, v]) =>
    `<div class="cre-pill" data-market="${k}">${v.label}</div>`
  ).join("");
  const regionPills = Object.entries(REGIONS).map(([k, v]) =>
    `<div class="cre-pill" data-region="${k}">${v.label}</div>`
  ).join("");

  return `
<style>${CSS}</style>
<div id="cre-feed-root">
  <div class="cre-topbar">
    <div class="cre-brand">Market Intelligence Feed</div>
    <div class="cre-live"><div class="cre-dot"></div><span id="cre-live-txt">Loading...</span></div>
  </div>
  <div class="cre-progress"><div class="cre-progress-bar" id="cre-progress" style="width:0%"></div></div>
  <div class="cre-stats">
    <div class="cre-stat"><div class="cre-stat-label">Total</div><div class="cre-stat-val" id="cre-s-total">—</div></div>
    <div class="cre-stat"><div class="cre-stat-label">Showing</div><div class="cre-stat-val" id="cre-s-filtered">—</div></div>
    <div class="cre-stat"><div class="cre-stat-label">Sources</div><div class="cre-stat-val" id="cre-s-src">—</div></div>
    <div class="cre-stat"><div class="cre-stat-label">Refreshed</div><div class="cre-stat-val sm" id="cre-s-time">—</div></div>
  </div>
  <div class="cre-fblock">
    <div class="cre-flabel">News type</div>
    <div class="cre-segs" id="cre-type-segs">
      <div class="cre-seg at" data-type="all">All news</div>
      <div class="cre-seg" data-type="economic">Economic / Macro</div>
      <div class="cre-seg" data-type="multifamily">Multifamily</div>
    </div>
  </div>
  <div class="cre-fblock">
    <div class="cre-flabel">Geography</div>
    <div class="cre-segs" id="cre-geo-segs">
      <div class="cre-seg ag" data-geo="all">All geographies</div>
      <div class="cre-seg" data-geo="national">National</div>
      <div class="cre-seg" data-geo="region">Region</div>
      <div class="cre-seg" data-geo="market">Market</div>
    </div>
    <div id="cre-region-sub" style="display:none;"><div class="cre-pills">${regionPills}</div></div>
    <div id="cre-market-sub" style="display:none;"><div class="cre-pills">${marketPills}</div></div>
  </div>
  <div class="cre-search-row">
    <input type="text" id="cre-search" placeholder="Search headlines..." />
    <button class="cre-btn" id="cre-refresh-btn">↻ Refresh</button>
  </div>
  <div class="cre-chips" id="cre-chips"></div>
  <div class="cre-rlabel" id="cre-rlabel">Loading...</div>
  <div class="cre-grid" id="cre-grid"><div class="cre-loading">Fetching and scoring articles...</div></div>
</div>`;
}

let allArticles = [];
let activeType = "all", activeGeo = "all";
let activeRegions = new Set(), activeMarkets = new Set();
let searchVal = "";

function matches(a) {
  const tOk = activeType === "all" || a.type === activeType;
  let gOk = true;
  if (activeGeo === "national") gOk = a.geo === "national";
  else if (activeGeo === "region") gOk = activeRegions.size === 0 || a.regions.some(r => activeRegions.has(r)) || a.geo === "national";
  else if (activeGeo === "market") gOk = activeMarkets.size === 0 || a.markets.some(m => activeMarkets.has(m));
  const q = searchVal.toLowerCase();
  const qOk = !q || a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q) || a.source.toLowerCase().includes(q);
  return tOk && gOk && qOk;
}

function geoTagsHTML(a) {
  let h = "";
  if (!a.markets.length && !a.regions.length) h += `<span class="cre-tag cre-tag-nat">National</span>`;
  a.regions.forEach(r => { if (REGIONS[r]) h += `<span class="cre-tag cre-tag-reg">${REGIONS[r].label}</span>`; });
  a.markets.forEach(m => { if (MARKETS[m]) h += `<span class="cre-tag cre-tag-mkt">${MARKETS[m].label}</span>`; });
  return h;
}

function render() {
  const filtered = allArticles.filter(matches);
  document.getElementById("cre-s-total").textContent = allArticles.length;
  document.getElementById("cre-s-filtered").textContent = filtered.length;
  document.getElementById("cre-rlabel").textContent = "Showing " + filtered.length + " article" + (filtered.length !== 1 ? "s" : "");

  const chips = [];
  if (activeType !== "all") chips.push({ label: activeType === "economic" ? "Economic / Macro" : "Multifamily", type:"type", val:activeType });
  if (activeGeo === "national") chips.push({ label:"National", type:"geo", val:"national" });
  activeRegions.forEach(r => chips.push({ label:REGIONS[r]?.label||r, type:"region", val:r }));
  activeMarkets.forEach(m => chips.push({ label:MARKETS[m]?.label||m, type:"market", val:m }));
  document.getElementById("cre-chips").innerHTML = chips.map(c =>
    `<div class="cre-chip" data-type="${c.type}" data-val="${c.val}">${c.label} ✕</div>`
  ).join("");

  const grid = document.getElementById("cre-grid");
  if (!filtered.length) {
    grid.innerHTML = allArticles.length === 0
      ? `<div class="cre-loading">Fetching and scoring articles...</div>`
      : `<div class="cre-empty">No articles match your filters.</div>`;
    return;
  }
  grid.innerHTML = filtered.map(a => `
    <a class="cre-card" href="${a.link}" target="_blank" rel="noopener">
      <div class="cre-card-top">
        <span class="cre-source">${a.source}</span>
        <span class="cre-time">${a.time}</span>
      </div>
      <div class="cre-title">${a.title}</div>
      <div class="cre-summary">${a.summary}</div>
      <div class="cre-tags">
        <span class="cre-tag ${a.type==='economic'?'cre-tag-eco':'cre-tag-mf'}">${a.type==='economic'?'Economic':'Multifamily'}</span>
        ${geoTagsHTML(a)}
        ${ANTHROPIC_API_KEY ? '<span class="cre-ai-badge">AI-tagged</span>' : ''}
      </div>
    </a>
  `).join("");
}

function updateGeoSub() {
  document.getElementById("cre-region-sub").style.display = activeGeo === "region" ? "block" : "none";
  document.getElementById("cre-market-sub").style.display = activeGeo === "market" ? "block" : "none";
  if (activeGeo !== "region") { activeRegions.clear(); document.querySelectorAll("[data-region]").forEach(p=>p.classList.remove("ar")); }
  if (activeGeo !== "market") { activeMarkets.clear(); document.querySelectorAll("[data-market]").forEach(p=>p.classList.remove("am")); }
}

async function fetchFeed(feed) {
  try {
    const res = await fetch(`${RSS2JSON}${encodeURIComponent(feed.url)}&count=15`);
    const data = await res.json();
    if (!data.items) return [];
    return data.items.map(item => {
      const raw = (item.description || item.summary || "").replace(/<[^>]+>/g, "").trim().slice(0, 200);
      return {
        title: item.title || "Untitled",
        summary: raw.length === 200 ? raw + "..." : raw,
        link: item.link || "#",
        source: feed.name,
        time: item.pubDate ? timeAgo(item.pubDate) : "Recent",
        pubDate: item.pubDate ? new Date(item.pubDate) : new Date(0),
      };
    });
  } catch(e) { return []; }
}

async function loadAllFeeds() {
  document.getElementById("cre-live-txt").textContent = "Loading feeds...";
  document.getElementById("cre-progress").style.width = "10%";

  const results = await Promise.allSettled(FEEDS.map(f => fetchFeed(f)));
  const raw = [];
  const sourcesLoaded = new Set();
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value.length) {
      r.value.forEach(a => raw.push({ ...a, feedName: FEEDS[i].name }));
      sourcesLoaded.add(FEEDS[i].name);
    }
  });
  // Global deal exclusion — remove ALL transaction articles before they enter the feed
  const cleanRaw = raw.filter(a => !hasDealSignal(a.title, a.summary));
  cleanRaw.sort((a, b) => b.pubDate - a.pubDate);

  document.getElementById("cre-s-src").textContent = sourcesLoaded.size;
  document.getElementById("cre-progress").style.width = "30%";
  document.getElementById("cre-live-txt").textContent = ANTHROPIC_API_KEY
    ? `AI-scoring ${cleanRaw.length} articles...`
    : `Tagging ${cleanRaw.length} articles...`;

  // Process in batches to show progressive results
  const BATCH = ANTHROPIC_API_KEY ? 5 : 20;
  const tagged = [];
  for (let i = 0; i < cleanRaw.length; i += BATCH) {
    const batch = cleanRaw.slice(i, i + BATCH);
    const batchTagged = await Promise.all(
      batch.map(a => tagArticle(a.title, a.summary, a.source).then(tags => ({ ...a, ...tags })))
    );
    batchTagged.forEach(a => tagged.push(a));
    allArticles = [...tagged].sort((a, b) => b.pubDate - a.pubDate);
    const pct = 30 + Math.round((i / cleanRaw.length) * 65);
    document.getElementById("cre-progress").style.width = pct + "%";
    document.getElementById("cre-s-total").textContent = allArticles.length;
    render();
  }

  allArticles = tagged.sort((a, b) => b.pubDate - a.pubDate);
  const now = new Date();
  document.getElementById("cre-s-time").textContent = now.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  document.getElementById("cre-live-txt").textContent = "Live · Updated " + now.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  document.getElementById("cre-progress").style.width = "100%";
  setTimeout(() => { document.getElementById("cre-progress").style.width = "0%"; }, 800);
  render();
  setInterval(loadAllFeeds, 24 * 60 * 60 * 1000);
}

function bindEvents() {
  document.getElementById("cre-type-segs").addEventListener("click", e => {
    const s = e.target.closest("[data-type]"); if (!s) return;
    document.querySelectorAll("[data-type]").forEach(x=>x.classList.remove("at"));
    s.classList.add("at"); activeType = s.dataset.type; render();
  });
  document.getElementById("cre-geo-segs").addEventListener("click", e => {
    const s = e.target.closest("[data-geo]"); if (!s) return;
    document.querySelectorAll("[data-geo]").forEach(x=>x.classList.remove("ag"));
    s.classList.add("ag"); activeGeo = s.dataset.geo; updateGeoSub(); render();
  });
  document.getElementById("cre-region-sub").addEventListener("click", e => {
    const p = e.target.closest("[data-region]"); if (!p) return;
    const r = p.dataset.region;
    if (activeRegions.has(r)) { activeRegions.delete(r); p.classList.remove("ar"); }
    else { activeRegions.add(r); p.classList.add("ar"); }
    render();
  });
  document.getElementById("cre-market-sub").addEventListener("click", e => {
    const p = e.target.closest("[data-market]"); if (!p) return;
    const m = p.dataset.market;
    if (activeMarkets.has(m)) { activeMarkets.delete(m); p.classList.remove("am"); }
    else { activeMarkets.add(m); p.classList.add("am"); }
    render();
  });
  document.getElementById("cre-chips").addEventListener("click", e => {
    const chip = e.target.closest(".cre-chip"); if (!chip) return;
    const {type,val} = chip.dataset;
    if (type==="type") { activeType="all"; document.querySelectorAll("[data-type]").forEach(x=>x.classList.remove("at")); document.querySelector("[data-type='all']").classList.add("at"); }
    if (type==="region") { activeRegions.delete(val); document.querySelector(`[data-region="${val}"]`)?.classList.remove("ar"); }
    if (type==="market") { activeMarkets.delete(val); document.querySelector(`[data-market="${val}"]`)?.classList.remove("am"); }
    if (type==="geo") { activeGeo="all"; document.querySelectorAll("[data-geo]").forEach(x=>x.classList.remove("ag")); document.querySelector("[data-geo='all']").classList.add("ag"); updateGeoSub(); }
    render();
  });
  document.getElementById("cre-search").addEventListener("input", e => { searchVal=e.target.value; render(); });
  document.getElementById("cre-refresh-btn").addEventListener("click", loadAllFeeds);
}

function init() {
  const target = document.getElementById("cre-news-feed");
  if (!target) { console.warn("CRE News Feed: place <div id='cre-news-feed'></div> on your page."); return; }
  target.innerHTML = buildHTML();
  bindEvents();
  loadAllFeeds();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();

})();
