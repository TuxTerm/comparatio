/** @import { Store, Product } from '$lib/types.js' */
import { json } from '@sveltejs/kit';
import { FIRECRAWL_API_KEY } from '$env/static/private';
import { STORES, DEFAULT_CURRENCY } from '$lib/config.js';
import { filterRelevant, computeInsights } from '$lib/analysis.js';
import { normalizeProductFormat, mapLimit } from '$lib/scraper.js';

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function asStringArray(value) {
	if (!Array.isArray(value)) return [];
	return value.filter((v) => typeof v === 'string');
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function asString(value) {
	return typeof value === 'string' ? value.trim() : '';
}

const CONCURRENCY = 2;
const MAX_PRODUCTS_PER_STORE = 4;

export async function POST({ request }) {
	try {
		const body = await request.json();
		const query = asString(body.query);
		const storeIds = asStringArray(body.stores);
		const userApiKey = asString(body.apiKey);

		if (!query) {
			return json({ ok: false, error: 'Please provide a product query.' }, { status: 400 });
		}

		const stores = /** @type {Store[]} */ (STORES).filter((s) => storeIds.includes(s.id));
		if (!stores.length) {
			return json({ ok: false, error: 'No valid stores selected.' }, { status: 400 });
		}

		const apiKey = userApiKey || FIRECRAWL_API_KEY || '';
		if (!apiKey) {
			return json(
				{ ok: false, error: 'No Firecrawl API key configured. Add FIRECRAWL_API_KEY to your .env or paste your key in the panel above.' },
				{ status: 400 }
			);
		}

		// ---- REAL MODE ----
		const { default: Firecrawl } = await import('@mendable/firecrawl-js');
		const app = new Firecrawl({ apiKey });
		/** @type {Product[]} */
		const results = [];
		/** @type {Array<{ id: string, name: string, count: number, error?: string }>} */
		const statuses = [];

		// Aggregate every selected source, sequential per store to stay polite
		for (const store of stores) {
			const res = await scrapeStore(app, store, query);
			results.push(...res.products);
			statuses.push({ id: store.id, name: store.name, count: res.products.length, error: res.error });
		}

		const relevant = filterRelevant(results, query);
		const insights = cleanInsights(computeInsights(relevant, query));

		return json({
			ok: true,
			mode: 'real',
			query,
			stores: stores.map((s) => ({ id: s.id, name: s.name })),
			statuses,
			currency: insights.currency || DEFAULT_CURRENCY,
			products: relevant,
			insights,
			info: ''
		});
	} catch (err) {
		console.error('[api/scrape]', err);
		/** @type {{ message?: string }} */
		const e = /** @type {any} */ (err);
		return json(
			{
				ok: false,
				error: e?.message || 'Something went wrong while scraping.'
			},
			{ status: 500 }
		);
	}
}

/**
 * Two-phase scrape per store:
 *  1. Fetch search page links cheaply.
 *  2. Deterministic `product`-format extraction on each listing URL, in parallel.
 * @param {any} app
 * @param {Store} store
 * @param {string} query
 * @returns {Promise<{ products: Product[], error?: string }>}
 */
async function scrapeStore(app, store, query) {
	const searchUrl = store.buildSearchUrl(query);
	/** @type {Error | null} */
	let softError = null;

	// Phase 1: candidate links from the search page
	let links;
	try {
		const res = await app.scrape(searchUrl, {
			formats: ['links'],
			onlyMainContent: true,
			timeout: 60000
		});
		links = res?.links || [];
	} catch (e) {
		/** @type {{ message?: string }} */
		const err = /** @type {any} */ (e);
		softError = new Error(err?.message || `Failed to load search page for ${store.name}`);
		console.error(`[scrapeStore:${store.id}] links phase failed`, err?.message);
		return { products: [], error: softError.message };
	}

	const itemUrls = extractItemUrls(store.id, links);
	if (!itemUrls.length) {
		softError = new Error(`No product links found on ${store.name} search page`);
		return { products: [], error: softError.message };
	}

	// Phase 2: parallel deterministic product extraction
	const slice = itemUrls.slice(0, MAX_PRODUCTS_PER_STORE);
	const products = await mapLimit(
		slice.map((url) => async () => {
			const res = await app.scrape(url, { formats: ['product'], timeout: 60000 });
			return normalizeProductFormat(store, res?.product, url);
		}),
		CONCURRENCY
	);

	return { products: products.filter(Boolean) };
}

/**
 * @param {string} storeId
 * @param {string[]} links
 * @returns {string[]}
 */
function extractItemUrls(storeId, links) {
	/** @type {Record<string, RegExp>} */
	const patterns = {
		flipkart: /https:\/\/www\.flipkart\.com\/[^"'\s<>?#]+\/p\/itm[A-Za-z0-9]+/,
		amazonin: /https:\/\/www\.amazon\.in\/[^"'\s<>?#]*\/dp\/[A-Z0-9]{10}/,
		snapdeal: /https:\/\/www\.snapdeal\.com\/product\/[^"'\s<>?#]+\/\d+/,
		meesho: /https:\/\/www\.meesho\.com\/p\/[^"'\s<>?#]+/,
		ebay: /https:\/\/(?:www\.)?ebay\.com\/itm\/(\d+)/
	};
	const pat = patterns[storeId] || patterns.ebay;
	/** @type {string[]} */
	const out = [];
	for (const link of links) {
		const m = String(link).match(pat);
		if (!m) continue;
		const clean = cleanupItemUrl(storeId, m[0]);
		if (clean && !out.includes(clean)) out.push(clean);
	}
	return out;
}

/**
 * @param {string} storeId
 * @param {string} raw
 * @returns {string}
 */
function cleanupItemUrl(storeId, raw) {
	const m = raw.match(/https:\/\/[^?#]+/);
	const stripped = m ? m[0] : raw;
	switch (storeId) {
		case 'flipkart': {
			const id = stripped.match(/\/p\/(itm[A-Za-z0-9]+)$/);
			if (id) return `https://www.flipkart.com/${stripped.split('/')[3]}/p/${id[1]}`;
			return stripped;
		}
		case 'amazonin': {
			const d = stripped.match(/\/dp\/([A-Z0-9]{10})/);
			if (d) return `https://www.amazon.in/dp/${d[1]}`;
			return stripped;
		}
		case 'snapdeal': {
			const id = stripped.match(/\/(\d+)$/);
			if (id) return `https://www.snapdeal.com/product/placeholder/${id[1]}`;
			return stripped;
		}
		case 'ebay': {
			const id = stripped.match(/(\d+)$/);
			if (id) return `https://www.ebay.com/itm/${id[1]}`;
			return stripped;
		}
		default:
			return stripped;
	}
}

/**
 * Strip internal scoring keys from the "best deal" before it ships to the client.
 * @param {import('$lib/types.js').Insights} insights
 * @returns {import('$lib/types.js').Insights}
 */
function cleanInsights(insights) {
	if (insights?.bestDeal && typeof insights.bestDeal === 'object') {
		const { _score, ...rest } = /** @type {any} */ (insights.bestDeal);
		return { ...insights, bestDeal: rest };
	}
	return insights;
}

export function GET() {
	return json({
		ok: true,
		hasKey: Boolean(FIRECRAWL_API_KEY),
		stores: STORES.map((s) => ({ id: s.id, name: s.name })),
		currency: DEFAULT_CURRENCY
	});
}