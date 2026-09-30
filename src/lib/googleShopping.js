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
 * Falls back to LLM-free deterministic markdown parsing.
 * @param {any} app — Firecrawl client
 * @param {string} query
 * @returns {Promise<{ products: Product[], error?: string }>}
 */
export async function scrapeGoogleShopping(app, query) {
	const url = buildGoogleShoppingUrl(query);
	try {
		const res = await app.scrape(url, {
			formats: ['markdown', 'html'],
			removeBase64Images: false,
			timeout: 60000
		});
		const products = parseGoogleShoppingMarkdown(res?.markdown || '');
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
	myg: '#e53935',
	reliance: '#1800b5',
	chroma: '#2a90d9',
	vijay: '#e85600',
	tata: '#0c4c9e',
};

const RATING_RE = /^(\d+(?:\.\d+)?)\(([\d.]+[KMG]?)\)$/;
const PRICE_RE = /^₹([\d,]+(?:\.\d+)?)(.*)$/;
const ORIG_PRICE_RE = /Usually\s*₹([\d,]+(?:\.\d+)?)/;
const CONDITION_RE = /(Refurbished|Pre[- ]owned|Preowned|Renewed|Used|Open[ -]box|New)/i;
const BADGE_RE = /^(LOW PRICE|HIGH PRICE|GREAT PRICE|Best|Top match|Compact|Slim|Small|Large)/i;
const RETURN_RE = /^(\d+[- ]day returns|FREE returns|Free shipping|Ships in \d+|In stock|Available now|Only \d+ left)/i;

/**
 * @param {string} title
 * @param {string[]} opts
 */
function conditionOf(title, opts) {
	const m = title.match(CONDITION_RE);
	if (m) return capitalize(m[1]);
	return opts[0] || 'New';
}

/** @param {string} s */
function capitalize(s) {
	return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * @param {string} slug
 * @returns {string}
 */
function slugify(slug) {
	return slug
		.toLowerCase()
		.replace(/&/g, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.replace(/\s+/g, '-');
}

/**
 * Turn a merchant label into a normalized name + id + color.
 * @param {string} raw
 * @returns {{ name: string, id: string, color: string }}
 */
function normalizeMerchant(raw) {
	let name = raw
		.replace(/\s*&\s*more$/i, '')
		.replace(/\s*&\s*more\b/i, '')
		.replace(/^sold by\s*/i, '')
		.trim();
	// Common normalizations
	if (/^amazon/i.test(name)) name = 'Amazon';
	if (/^flipkart/i.test(name)) name = 'Flipkart';
	if (/^meesho/i.test(name)) name = 'Meesho';
	const id = slugify(name);
	const color = MERCHANT_COLORS[id] || MERCHANT_COLORS[name.toLowerCase()] || '#cba6f7';
	return { name, id, color };
}

/**
 * Parse the Firecrawl markdown of a Google Shopping page into product rows.
 * Structure per tile:
 *   [badge/image/title]
 *   ₹54,932Usually ₹64,308   <- price line (anchor)
 *   [image/merchant]
 *   Zepto & more            <- merchant
 *   4.8(28K)                <- rating (may appear above or below)
 * @param {string} md
 * @returns {Product[]}
 */
export function parseGoogleShoppingMarkdown(md) {
	if (!md) return [];
	const lines = md.split('\n');
	/** @type {Product[]} */
	const products = [];
	const seen = new Set();

	for (let i = 0; i < lines.length; i++) {
		const line = (lines[i] || '').trim();
		const m = line.match(PRICE_RE);
		if (!m) continue;
		// skip filter-range rows
		if (line.includes('–') || line.includes('−')) continue;
		// skip EMi-style titles that embed a spaced ₹
		if (line.length > 60 && /EMI/i.test(line)) continue;

		const price = parseFloat(m[1].replace(/,/g, ''));
		if (!price || price <= 0) continue;

		const tail = m[2] || '';
		const origMatch = tail.match(ORIG_PRICE_RE);
		const orig = origMatch ? parseFloat(origMatch[1].replace(/,/g, '')) : null;
		const condition = conditionOf(tail + lines[i - 1] || '', ['New', 'Used', 'Refurbished']);

		// title: scan up for the nearest text line (skip blanks, images, ratings, badges, return/shipping notes)
		let title = null;
		for (let j = i - 1; j >= Math.max(0, i - 8); j--) {
			const t = (lines[j] || '').trim();
			if (!t || t.startsWith('![')) continue;
			if (RATING_RE.test(t)) continue;
			if (BADGE_RE.test(t)) continue;
			if (RETURN_RE.test(t)) continue;
			if (/EMI: ₹/.test(t)) continue;
			if (PRICE_RE.test(t)) continue;
			title = t.replace(/\\\|/g, '|');
			break;
		}
		if (!title) continue;

		// merchant: scan down for the nearest text line
		let merchant = null;
		for (let j = i + 1; j <= Math.min(lines.length - 1, i + 7); j++) {
			const t = (lines[j] || '').trim();
			if (!t || t.startsWith('![')) continue;
			if (RATING_RE.test(t)) continue;
			if (RETURN_RE.test(t)) continue;
			if (BADGE_RE.test(t)) continue;
			if (/^Usually ₹/.test(t)) continue;
			if (/^Sold By/i.test(t)) continue;
			merchant = t;
			break;
		}

		// rating + reviews near the tile (i-4..i+8)
		let rating = null;
		let reviews = null;
		for (let j = Math.max(0, i - 4); j <= Math.min(lines.length - 1, i + 8); j++) {
			const t = (lines[j] || '').trim();
			const r = t.match(RATING_RE);
			if (r) {
				rating = parseFloat(r[1]);
				const v = r[2];
				reviews = parseReviews(v);
				break;
			}
		}

		// image: nearest image line above the title
		let image = '';
		for (let j = i - 2; j >= Math.max(0, i - 8); j--) {
			const t = lines[j] || '';
			const im = t.match(/!\[.*?\]\((data:image\/[a-z]+;base64,[^)]+)\)/);
			if (im) {
				image = im[1];
				break;
			}
		}

		const mName = merchant ? normalizeMerchant(merchant) : { name: 'Google Shopping', id: 'google', color: '#cba6f7' };

		// dedupe identical (title, price)
		const key = `${title.toLowerCase()}::${price}`;
		if (seen.has(key)) continue;
		seen.add(key);

		const id = `gs-${slugify(title).slice(0, 24)}-${Math.round(price)}-${hashOf(title)}`;
		products.push({
			id,
			title,
			price,
			currency: DEFAULT_CURRENCY,
			url: productDeepLink(title),
			imageUrl: image,
			rating,
			reviewsCount: reviews,
			condition,
			shipping: 0,
			shipsFrom: '',
			storeId: mName.id,
			storeName: mName.name,
			storeColor: mName.color,
			keywords: [title.toLowerCase()],
			source: 'google-shopping',
			details: {
				brand: '',
				listPrice: orig,
				inStock: true
			}
		});
	}
	return products;
}

/** @param {string} s */
function hashOf(s) {
	let h = 5381;
	for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
	return Math.abs(h).toString(36);
}

/**
 * Best-effort deep link: an exact Google Shopping search for the product title.
 * @param {string} title
 */
function productDeepLink(title) {
	return buildGoogleShoppingUrl(title);
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
	const unit = m[2].toUpperCase();
	n *= mult[unit] || 1;
	return Math.round(n);
}