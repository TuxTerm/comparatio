import { redirect, error } from '@sveltejs/kit';
import { FIRECRAWL_API_KEY } from '$env/static/private';

/** @type {Map<string, string>} */
const cache = new Map();
const CACHE_MAX = 500;

/** @type {Record<string, string>} */
const MERCHANT_DOMAINS = {
	flipkart: 'flipkart.com',
	amazon: 'amazon.in',
	'amazon india': 'amazon.in',
	meesho: 'meesho.com',
	snapdeal: 'snapdeal.com',
	cashify: 'cashify.in',
	zepto: 'zeptonow.com',
	croma: 'croma.com',
	'reliance digital': 'reliancedigital.in',
	'vijay sales': 'vijaysales.com',
	myg: 'myg.in'
};

/**
 * Resolve a product to its real merchant URL and 302-redirect the browser there.
 * Google Shopping's SERP hides merchant links behind JS, so we search for the
 * product and pick the best matching merchant host.
 */
export async function GET({ url }) {
	const title = url.searchParams.get('title')?.trim() || '';
	const merchant = url.searchParams.get('merchant')?.trim() || '';

	if (!title) throw error(400, 'Missing title');

	const cacheKey = `${merchant.toLowerCase()}::${title.toLowerCase()}`;
	const cached = cache.get(cacheKey);
	if (cached) throw redirect(302, cached);

	const apiKey = FIRECRAWL_API_KEY || '';
	if (!apiKey) {
		throw redirect(302, fallbackSearch(title, merchant));
	}

	try {
		const { default: Firecrawl } = await import('@mendable/firecrawl-js');
		const app = new Firecrawl({ apiKey });
		const query = merchant ? `${title} ${merchant}` : title;
		const res = await app.search(query, { limit: 8 });
		const results = /** @type {Array<{url:string,title?:string}>} */ (res?.web || []);

		const domain = domainForMerchant(merchant);
		const picked = pickResult(results, domain);
		if (picked) {
			remember(cacheKey, picked);
			throw redirect(302, picked);
		}
	} catch (e) {
		// A redirect thrown inside try is not a real error — rethrow it.
		if (isRedirect(e)) throw e;
		console.error('[api/resolve]', /** @type {any} */ (e)?.message);
	}

	throw redirect(302, fallbackSearch(title, merchant));
}

/**
 * @param {Array<{url:string,title?:string}>} results
 * @param {string} domain
 * @returns {string|null}
 */
function pickResult(results, domain) {
	if (!results.length) return null;
	if (domain) {
		const host = results.find((r) => safeHost(r.url) === domain || safeHost(r.url).endsWith(`.${domain}`));
		if (host) return host.url;
	}
	// Otherwise take the first non-Google, non-aggregator result.
	const clean = results.find((r) => {
		const h = safeHost(r.url);
		return h && !/(google|youtube|facebook|instagram|pinterest|twitter)/.test(h);
	});
	return clean ? clean.url : null;
}

/** @param {string} merchant */
function domainForMerchant(merchant) {
	const key = merchant.toLowerCase().replace(/\s*&\s*more\s*/g, '').trim();
	if (MERCHANT_DOMAINS[key]) return MERCHANT_DOMAINS[key];
	// If the merchant label already contains a domain, use it.
	const m = key.match(/([a-z0-9-]+\.(?:com|in|net|org|co\.in|co))/i);
	return m ? m[1].toLowerCase() : '';
}

/** @param {string} u */
function safeHost(u) {
	try {
		return new URL(u).hostname.replace(/^www\./, '');
	} catch {
		return '';
	}
}

/** @param {string} k @param {string} v */
function remember(k, v) {
	if (cache.size >= CACHE_MAX) {
		const oldest = cache.keys().next().value;
		if (oldest !== undefined) cache.delete(oldest);
	}
	cache.set(k, v);
}

/** @param {unknown} e */
function isRedirect(e) {
	return Boolean(e && typeof e === 'object' && 'status' in e && /** @type {any} */ (e).status === 302);
}

/** @param {string} title @param {string} merchant */
function fallbackSearch(title, merchant) {
	const q = encodeURIComponent(merchant ? `${title} ${merchant}` : title);
	return `https://www.google.com/search?q=${q}`;
}