/** @import { Product } from './types.js' */
import { DEFAULT_CURRENCY } from './config.js';

/**
 * Build the Google Shopping (India) search URL. `udm=28` forces the
 * server-rendered shopping results layout.
 * @param {string} query
 * @returns {string}
 */
export function buildGoogleShoppingUrl(query) {
	const q = encodeURIComponent(query);
	return `https://www.google.com/search?q=${q}&tbm=shop&hl=en&gl=in&udm=28`;
}

/**
 * Scrape Google Shopping with Firecrawl and parse the results into products.
 * Parsing is deterministic and per-product (HTML `data-pid` tiles), so titles,
 * prices, conditions, merchants and images are always taken from the same tile.
 * @param {any} app — Firecrawl client
 * @param {string} query
 * @returns {Promise<{ products: Product[], error?: string }>}
 */
export async function scrapeGoogleShopping(app, query) {
	const url = buildGoogleShoppingUrl(query);
	try {
		const res = await app.scrape(url, {
			formats: ['html'],
			removeBase64Images: false,
			timeout: 60000
		});
		const products = parseGoogleShoppingHtml(res?.html || '');
		if (!products.length) {
			return { products: [], error: 'No product tiles found in Google Shopping results.' };
		}
		return { products };
	} catch (e) {
		/** @type {{ message?: string }} */
		const err = /** @type {any} */ (e);
		return { products: [], error: err?.message || 'Google Shopping scrape failed.' };
	}
}

/** @type {Record<string, string>} */
const MERCHANT_COLORS = {
	flipkart: '#2874f0',
	amazon: '#ff9900',
	'amazon.in': '#ff9900',
	snapdeal: '#e0393e',
	meesho: '#e23744',
	cashify: '#5ace51',
	zepto: '#7b2d8b',
	croma: '#2a90d9',
	reliance: '#1800b5',
	vijay: '#e85600',
	tata: '#0c4c9e'
};

const RATING_RE = /^\d(?:\.\d)?$/;
const REVIEWS_RE = /^\(([\d.]+[KMG]?)\)$/i;
const PRICE_RE = /^₹\s?([\d,]+(?:\.\d+)?)/;
const ORIG_RE = /^Usually\s*₹\s?([\d,]+(?:\.\d+)?)/i;
const BADGE_RE = /^(LOW PRICE|HIGH PRICE|GREAT PRICE|BEST|TOP MATCH|SPONSORED|AD)$/i;
const RETURNS_RE = /(day returns|free returns|free shipping|in stock|ships in|only \d+ left|returns)/i;
/** @type {Array<[RegExp, string]>} */
const CONDITION_MAP = [
	[/refurbishe/i, 'Refurbished'],
	[/renew/i, 'Renewed'],
	[/open[ -]?box/i, 'Open box'],
	[/pre[ -]?owned|preowned|used/i, 'Used'],
	[/\bnew\b/i, 'New']
];

/**
 * Parse a Google Shopping SERP HTML document into normalized products by
 * walking each `data-pid` product tile independently.
 * @param {string} html
 * @returns {Product[]}
 */
export function parseGoogleShoppingHtml(html) {
	if (!html) return [];
	// Each element after the split is a single product tile's markup.
	const tiles = html.split(/data-pid="/).slice(1);
	/** @type {Product[]} */
	const products = [];
	const seen = new Set();

	for (const rawTile of tiles) {
		const tile = rawTile.slice(0, 80000);
		const parsed = parseTile(tile);
		if (!parsed) continue;

		const key = `${parsed.title.toLowerCase()}::${parsed.price}`;
		if (seen.has(key)) continue;
		seen.add(key);
		products.push(parsed);
	}
	return products;
}

/**
 * @param {string} tile
 * @returns {Product|null}
 */
function parseTile(tile) {
	const image = extractProductImage(tile);
	const title = extractTitle(tile);
	if (!title) return null;

	const tokens = tokenize(tile);
	const priceIdx = tokens.findIndex((t) => PRICE_RE.test(t));
	if (priceIdx < 0) return null;

	const price = toNumber(tokens[priceIdx].match(PRICE_RE)?.[1]);
	if (!price || price <= 0) return null;

	let original = null;
	let condition = null;
	let merchant = null;
	let rating = null;
	let reviews = null;

	let k = priceIdx + 1;
	const origM = tokens[k]?.match(ORIG_RE);
	if (origM) {
		original = toNumber(origM[1]);
		k++;
	}

	while (k < tokens.length && k < priceIdx + 10) {
		const t = tokens[k];
		if (/& ?more/i.test(t)) {
			k++;
			continue;
		}
		const runit = t.match(REVIEWS_RE);
		if (runit && reviews == null) {
			reviews = parseReviews(runit[1]);
			k++;
			continue;
		}
		if (RATING_RE.test(t) && rating == null && merchant) {
			rating = parseFloat(t);
			k++;
			continue;
		}
		if (RETURNS_RE.test(t) && !/\d{3,}/.test(t)) {
			k++;
			continue;
		}
		if (BADGE_RE.test(t)) {
			k++;
			continue;
		}
		const cond = matchCondition(t);
		if (cond && condition == null && t.length <= 20) {
			condition = cond;
			k++;
			continue;
		}
		if (!merchant && isMerchantToken(t)) {
			merchant = cleanMerchant(t);
			k++;
			continue;
		}
		break;
	}

	const mName = merchant ? normalizeMerchant(merchant) : { name: 'Google Shopping', id: 'google', color: '#cba6f7' };
	const conditionFinal = condition || matchCondition(title) || 'New';

	return {
		id: `gs-${slugify(title).slice(0, 24)}-${Math.round(price)}-${hashOf(title)}`,
		title,
		price,
		currency: DEFAULT_CURRENCY,
		url: buildResolveUrl(title, mName.name),
		imageUrl: image,
		rating,
		reviewsCount: reviews,
		condition: conditionFinal,
		shipping: 0,
		shipsFrom: '',
		storeId: mName.id,
		storeName: mName.name,
		storeColor: mName.color,
		keywords: [title.toLowerCase()],
		source: 'google-shopping',
		details: {
			brand: '',
			listPrice: original,
			inStock: true
		}
	};
}

/**
 * Product image is the single `<img class="VeBrne" src="data:image/webp;...">`.
 * Falls back to the first webp data URI in the tile.
 * @param {string} tile
 * @returns {string}
 */
function extractProductImage(tile) {
	// Minimum size to discard the 16px rating/merchant icons and the 82-char
	// 1x1 transparent spacer GIFs that stand in for unloaded lazy images.
	const MIN = 400;
	const tagged = tile.match(/<img[^>]*class="[^"]*\bVeBrne\b[^"]*"[^>]*?src="(data:image\/[^"]+)"/);
	if (tagged && tagged[1].length > MIN) return tagged[1];

	// Otherwise pick the largest embedded image (product photos dwarf icons).
	/** @type {string[]} */
	const all = [...tile.matchAll(/src="(data:image\/[a-z0-9+.-]+;base64,[^"]+)"/gi)]
		.map((m) => m[1])
		.filter((s) => s.length > MIN);
	if (!all.length) return '';
	return all.reduce((a, b) => (b.length > a.length ? b : a), '');
}

/**
 * The product title is the longest human-readable `title="..."` attribute in
 * the tile (avoids splitting on literal `|` characters inside the title).
 * @param {string} tile
 * @returns {string}
 */
function extractTitle(tile) {
	const candidates = [...tile.matchAll(/title="([^"]{5,160})"/g)]
		.map((m) => decodeEntities(m[1]))
		.filter((t) => !BADGE_RE.test(t) && !/^(in stock|out of stock|low price)$/i.test(t));
	if (!candidates.length) return '';
	// Prefer the longest, most descriptive candidate.
	candidates.sort((a, b) => b.length - a.length);
	return candidates[0].replace(/\s+/g, ' ').trim();
}

/**
 * Strip tags/scripts and return cleaned text tokens separated by `|`.
 * @param {string} tile
 * @returns {string[]}
 */
function tokenize(tile) {
	const text = tile
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/data:image\/[a-z]+;base64,[^"]+/gi, ' ')
		.replace(/<[^>]+>/g, '|');
	return text
		.split('|')
		.map((t) => decodeEntities(t).replace(/[\u00a0\s]+/g, ' ').trim())
		.filter((t) => t.length > 0 && t.length < 160);
}

/** @param {string} s @returns {string} */
function decodeEntities(s) {
	return s
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&#8377;/gi, '₹')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>');
}

/** @param {string|undefined} s @returns {number} */
function toNumber(s) {
	if (!s) return 0;
	return parseFloat(String(s).replace(/,/g, '')) || 0;
}

/**
 * @param {string} t
 * @returns {string|null}
 */
function matchCondition(t) {
	for (const [re, label] of CONDITION_MAP) {
		if (re.test(t)) return label;
	}
	return null;
}

/**
 * A merchant token is a short human-readable name (optionally with a domain)
 * that isn't a price, rating, condition or returns blurb.
 * @param {string} t
 * @returns {boolean}
 */
function isMerchantToken(t) {
	if (t.length < 2 || t.length > 45) return false;
	if (/^₹/.test(t)) return false;
	if (/^\d+(\.\d+)?$/.test(t)) return false;
	if (RATING_RE.test(t) || REVIEWS_RE.test(t)) return false;
	if (RETURNS_RE.test(t)) return false;
	if (BADGE_RE.test(t)) return false;
	if (matchCondition(t)) return false;
	if (/^& ?more$/i.test(t)) return false;
	if (/[<>{}]/.test(t)) return false;
	if (/\b(emi|monthly|off|discount|coupon|save)\b/i.test(t) && !/[a-z]{3,}\.(com|in|net|org)/i.test(t)) return false;
	return /[A-Za-z]/.test(t);
}

/**
 * @param {string} raw
 * @returns {string}
 */
function cleanMerchant(raw) {
	return raw
		.replace(/& ?more/i, '')
		.replace(/^sold by\s*/i, '')
		.replace(/^by\s+/i, '')
		.trim();
}

/**
 * @param {string} raw
 * @returns {{ name: string, id: string, color: string }}
 */
function normalizeMerchant(raw) {
	let name = cleanMerchant(raw);
	if (/^amazon/i.test(name)) name = 'Amazon';
	else if (/^flipkart/i.test(name)) name = 'Flipkart';
	else if (/^meesho/i.test(name)) name = 'Meesho';
	else if (/^snapdeal/i.test(name)) name = 'Snapdeal';
	else if (/^zepto/i.test(name)) name = 'Zepto';
	else if (/^cashify/i.test(name)) name = 'Cashify';
	const id = slugify(name);
	const color = MERCHANT_COLORS[id] || MERCHANT_COLORS[name.toLowerCase()] || '#cba6f7';
	return { name, id, color };
}

/**
 * We cannot extract the merchant product URL from the SERP (Google serves it
 * via JS only), so link through our resolver endpoint which finds the real
 * merchant page. Encoding the merchant lets the resolver pick the right domain.
 * @param {string} title
 * @param {string} merchant
 * @returns {string}
 */
function buildResolveUrl(title, merchant) {
	const p = new URLSearchParams({ title, merchant });
	return `/api/resolve?${p.toString()}`;
}

/** @param {string} s */
function slugify(s) {
	return s
		.toLowerCase()
		.replace(/&/g, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.replace(/\s+/g, '-');
}

/** @param {string} s */
function hashOf(s) {
	let h = 5381;
	for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
	return Math.abs(h).toString(36);
}

/**
 * @param {string} v — e.g. "28K", "9.3K", "1,234"
 * @returns {number|null}
 */
function parseReviews(v) {
	if (!v) return null;
	const m = /^([\d.]+)([KMG]?)$/i.exec(v.replace(/,/g, ''));
	if (!m) return null;
	let n = parseFloat(m[1]);
	/** @type {Record<string, number>} */
	const mult = { K: 1e3, M: 1e6, G: 1e9 };
	n *= mult[m[2].toUpperCase()] || 1;
	return Math.round(n);
}