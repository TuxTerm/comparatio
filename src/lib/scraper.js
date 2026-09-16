/** @import { Product, Store } from './types.js' */
import { DEFAULT_CURRENCY } from './config.js';

/**
 * Build a normalized product object from Firecrawl's deterministic "product"
 * format response, or null if the page didn't yield a buyable product.
 * @param {Store} store
 * @param {any} product
 * @param {string} fallbackUrl
 * @returns {Product|null}
 */
export function normalizeProductFormat(store, product, fallbackUrl) {
	if (!product || typeof product !== 'object') return null;
	if (!product.title) return null;

	const variant = product.variants?.[0];
	const price = variant?.price?.amount;
	const currency = variant?.price?.currency || DEFAULT_CURRENCY;
	// On sale, "was" price lives in sale.originalPrice; raw list price in originalPrice
	const listPrice = variant?.price?.amount;

	if (!price || price <= 0) return null;

	const inStock = variant?.availability?.inStock !== false;

	return {
		id: `${store.id}-${hashOf(fallbackUrl)}`,
		title: String(product.title),
		price: Number(price),
		currency: String(currency || DEFAULT_CURRENCY),
		url: product.url || fallbackUrl,
		imageUrl: variant?.images?.[0]?.url || '',
		rating: null,
		reviewsCount: null,
		condition: inferCondition(product.title, ['New', 'Open box', 'Used', 'Refurbished', 'Renewed']),
		shipping: 0,
		shipsFrom: '',
		storeId: store.id,
		storeName: store.name,
		storeColor: store.color,
		keywords: [product.title.toLowerCase()],
		source: 'live',
		details: {
			brand: product.brand || '',
			listPrice: listPrice || null,
			inStock
		}
	};
}

/**
 * Seed a product object from an eBay-style search page item card (scraped via
 * the cheap `links` format is not enough — price isn't there), so this remains
 * as a merge helper for fields we can capture alongside direct URLs.
 * @param {Store} store
 * @param {any} card
 */
export function fromCard(store, card) {
	const raw = card && typeof card === 'object' ? card : {};
	const title = String(raw.title || '');
	const priceText = String(raw.price || '');
	const price = Number(priceText.replace(/[^0-9.]/g, ''));
	const currency = detectCurrency(raw.price);
	if (!title || !price) return null;
	return {
		id: `${store.id}-${hashOf(String(raw.url || title))}`,
		title,
		price,
		currency: currency || DEFAULT_CURRENCY,
		url: String(raw.url || ''),
		imageUrl: String(raw.image || ''),
		rating: raw.rating != null ? Number(raw.rating) : null,
		reviewsCount: raw.reviewsCount != null ? Number(raw.reviewsCount) : null,
		condition: String(raw.condition || 'New'),
		shipping: 0,
		shipsFrom: '',
		storeId: store.id,
		storeName: store.name,
		storeColor: store.color,
		keywords: [],
		source: 'live'
	};
}

/**
 * @param {string} title
 * @param {string[]} options
 * @returns {string}
 */
function inferCondition(title, options) {
	const t = title.toLowerCase();
	if (t.includes('refurbishe')) return 'Refurbished';
	if (t.includes('renew')) return 'Renewed';
	if (t.includes('open box')) return 'Open box';
	if (t.includes('used') || t.includes('pre-owned') || t.includes('good') || t.includes('excellent') || t.includes('very good') || t.includes('fair') || t.includes('poor') || t.includes('acceptable') || t.includes('new other')) return 'Used';
	return options[0] || 'New';
}

/**
 * @param {string|number|undefined} s
 * @returns {string}
 */
function detectCurrency(s) {
	const str = String(s || '');
	if (str.includes('$') || /US\s?\$|USD/i.test(str)) return 'USD';
	if (str.includes('€')) return 'EUR';
	if (str.includes('£')) return 'GBP';
	if (/₹|INR/i.test(str)) return 'INR';
	if (str.includes('C$') || /CAD/i.test(str)) return 'CAD';
	return DEFAULT_CURRENCY;
}

/**
 * @param {string} s
 * @returns {string}
 */
function hashOf(s) {
	let h = 5381;
	for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
	return Math.abs(h).toString(36);
}

/**
 * Run async tasks with bounded concurrency.
 * @template T
 * @param {Array<() => Promise<T|null>>} tasks
 * @param {number} limit
 * @returns {Promise<Array<T>>}
 */
export async function mapLimit(tasks, limit) {
	/** @type {any[]} */
	const results = [];
	const queue = [...tasks];
	async function worker() {
		while (queue.length) {
			const task = queue.shift();
			if (!task) break;
			try {
				const val = await task();
				if (val != null) results.push(val);
			} catch {
				// individual page failures are swallowed
			}
		}
	}
	await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, worker));
	return results;
}