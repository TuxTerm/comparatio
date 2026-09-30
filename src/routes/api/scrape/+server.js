/** @import { Store, Product } from '$lib/types.js' */
import { json } from '@sveltejs/kit';
import { FIRECRAWL_API_KEY } from '$env/static/private';
import { STORES, DEFAULT_CURRENCY } from '$lib/config.js';
import { filterRelevant, computeInsights } from '$lib/analysis.js';
import { scrapeGoogleShopping } from '$lib/googleShopping.js';

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

export async function POST({ request }) {
	try {
		const body = await request.json();
		const query = asString(body.query);
		const storeIds = asStringArray(body.stores);
		const userApiKey = asString(body.apiKey);

		if (!query) {
			return json({ ok: false, error: 'Please provide a product query.' }, { status: 400 });
		}

		const selectedStores = /** @type {Store[]} */ (STORES).filter((s) => storeIds.includes(s.id));
		if (!selectedStores.length) {
			return json({ ok: false, error: 'No valid sources selected.' }, { status: 400 });
		}

		const apiKey = userApiKey || FIRECRAWL_API_KEY || '';
		if (!apiKey) {
			return json(
				{ ok: false, error: 'No Firecrawl API key configured. Add FIRECRAWL_API_KEY to your .env or paste your key in the panel above.' },
				{ status: 400 }
			);
		}

		// ---- SCRAPE VIA GOOGLE SHOPPING ----
		const { default: Firecrawl } = await import('@mendable/firecrawl-js');
		const app = new Firecrawl({ apiKey });
		const res = await scrapeGoogleShopping(app, query);

		// Filter to only merchants the user selected. Google Shopping returns a
		// mixed set of merchants, so respect the toggle when it's narrowed.
		let products = res.products;
		if (storeIds.length < STORES.length) {
			products = products.filter((p) => selectedStores.some((s) => s.name.toLowerCase() === String(p.storeName).toLowerCase()));
		}

		const relevant = filterRelevant(products, query);
		const insights = cleanInsights(computeInsights(relevant, query));

		// Build per-merchant status from the actual results.
		const statusMap = new Map();
		for (const p of relevant) {
			const key = p.storeName;
			if (!statusMap.has(key)) statusMap.set(key, { name: key, count: 0 });
			statusMap.get(key).count += 1;
		}
		const statuses = [...statusMap.entries()].map(([name, v]) => ({ id: slug(name), name, count: v.count, error: res.error }));
		if (!relevant.length && res.error) {
			statuses.push({ id: 'google', name: 'Google Shopping', count: 0, error: res.error });
		}

		return json({
			ok: true,
			mode: 'real',
			query,
			stores: selectedStores.map((s) => ({ id: s.id, name: s.name })),
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
 * @param {string} s
 */
function slug(s) {
	return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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