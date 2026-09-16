/** @typedef {import('./types.js').Product} Product */

const EXTRA_KEYWORDS = ['accessory', 'case', 'cover', 'charger', 'cable', 'sticker', 'skin', 'protector', 'screen guard', 'bumper', 'stand', 'mount', 'dock', 'keyboard', 'bag', '$5', '₹5', 'part', 'for repair', 'replacement'];

/** @type {Record<string, string>} */
const COLORS = {
	flipkart: '#2874f0',
	amazonin: '#ff9900',
	snapdeal: '#e0393e',
	meesho: '#e23744',
	ebay: '#e53238'
};

/**
 * @param {string|null|undefined} title
 * @param {string[]} queryTokens
 * @returns {number}
 */
export function titleScore(title, queryTokens) {
	const t = (title || '').toLowerCase();
	if (!queryTokens.length) return 1;
	let matched = 0;
	for (const tok of queryTokens) {
		if (t.includes(tok)) matched++;
	}
	return matched / queryTokens.length;
}

/**
 * Normalize a raw product row into a consistent shape.
 * @param {Record<string, any>} p
 * @param {string} storeId
 * @param {string} storeName
 * @returns {Product}
 */
export function normalizeProduct(p, storeId, storeName) {
	return {
		id: String(p.id || `${storeId}-${Math.random().toString(36).slice(2)}`),
		title: String(p.title || 'Untitled listing'),
		price: Number(p.price) || 0,
		currency: p.currency || 'INR',
		url: p.url || p.link || '#',
		imageUrl: p.imageUrl || p.image || '',
		rating: p.rating != null ? Number(p.rating) : null,
		reviewsCount: p.reviewsCount != null ? Number(p.reviewsCount) : null,
		condition: p.condition || 'New',
		shipping: p.shipping != null ? Number(p.shipping) : 0,
		shipsFrom: p.shipsFrom || '',
		storeId,
		storeName,
		storeColor: COLORS[storeId] || '#8b5cf6',
		keywords: Array.isArray(p.keywords) ? p.keywords : [],
		source: p.source || 'firecrawl'
	};
}

/**
 * Filter products to real matches of the query, drop accessory spam, and remove
 * placeholder/low-outlier prices (e.g. $1 auction starting bids) that would
 * distort the "best price" suggestion.
 * @param {Product[]} products
 * @param {string} query
 * @returns {Product[]}
 */
export function filterRelevant(products, query) {
	const tokens = query
		.toLowerCase()
		.split(/[\s,&+()\-/]+/)
		.filter((t) => t.length >= 2 && /^[a-z0-9]+$/.test(t));
	const trimmedTokens = tokens.slice(0, Math.max(3, Math.ceil(tokens.length / 2)));
	const productLike = tokens.length >= 2;

	const priced = products.filter((p) => p.price && p.price > 0);
	const prices = priced.map((p) => p.price).sort((a, b) => a - b);
	const median = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
	// Guard against auction starting-bids and placeholders: a real listing is
	// almost never below 8% of the median price of the set.
	const lowFloor = Math.max(3, median * 0.08);

	return products.filter((p) => {
		const title = (p.title || '').toLowerCase();
		if (productLike) {
			const score = titleScore(title, trimmedTokens);
			if (score < 0.35) return false;
		}
		const matchedKeyword = EXTRA_KEYWORDS.find((kw) => title.includes(kw));
		if (matchedKeyword && productLike && !query.toLowerCase().includes(matchedKeyword)) return false;
		if (!p.price || p.price <= 0) return false;
		if (prices.length >= 5 && p.price < lowFloor) return false;
		return true;
	});
}

/**
 * @param {number[]} sorted
 * @param {number} q
 * @returns {number}
 */
function quantile(sorted, q) {
	if (!sorted.length) return 0;
	const pos = (sorted.length - 1) * q;
	const base = Math.floor(pos);
	const rest = pos - base;
	return sorted[base] + (sorted[base + 1] !== undefined ? rest * (sorted[base + 1] - sorted[base]) : 0);
}

/**
 * @param {number} n
 * @param {number} d
 * @returns {number}
 */
function round(n, d = 2) {
	return Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
}

/**
 * Compute pricing statistics plus the "best value" suggestion.
 * @param {Product[]} products
 * @param {string} query
 * @returns {import('./types.js').Insights}
 */
export function computeInsights(products, query) {
	const prices = products.map((p) => p.price).sort((a, b) => a - b);
	const n = prices.length;
	const mean = prices.reduce((a, b) => a + b, 0) / n;
	const median = n % 2 === 1 ? prices[(n - 1) / 2] : (prices[n / 2 - 1] + prices[n / 2]) / 2;
	const min = prices[0] ?? 0;
	const max = prices[n - 1] ?? 0;
	const q1 = quantile(prices, 0.25);
	const q3 = quantile(prices, 0.75);
	const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

	const rank = (/** @type {Product} */ p) => {
		const s = titleScore(p.title, tokens);
		const conditionBonus = /new/i.test(p.condition || '') ? 1 : 0;
		const ratingBonus = p.rating && p.rating >= 4 ? 0.5 : 0;
		const reviewBonus = (p.reviewsCount || 0) > 300 ? 1 : 0;
		return 3 * s + conditionBonus + ratingBonus + reviewBonus;
	};

	/** @type {Array<Product & { _score: number }>} */
	const scored = products.map((p) => ({ ...p, _score: rank(p) }));
	scored.sort((a, b) => b._score - a._score || a.price - b.price);
	const bestDeal = scored[0] || null;

	return {
		total: products.length,
		bestDeal,
		avg: round(mean, 2),
		median: round(median, 2),
		min: round(min, 2),
		max: round(max, 2),
		q1: round(q1, 2),
		q3: round(q3, 2),
		cheapest:
			products.reduce((a, b) => (b.price < a.price ? b : a), products[0]) || null,
		mostExpensive:
			products.reduce((a, b) => (b.price > a.price ? b : a), products[0]) || null,
		currency: prices.length ? products[0].currency || 'INR' : 'INR'
	};
}

/**
 * @param {number} amount
 * @param {string} currency
 * @returns {string}
 */
export function formatCurrency(amount, currency = 'INR') {
	try {
		return new Intl.NumberFormat('en-IN', {
			style: 'currency',
			currency,
			maximumFractionDigits: currency === 'INR' ? 0 : 2
		}).format(amount);
	} catch {
		return `${currency} ${amount}`;
	}
}

export const EXTRACTION_SCHEMA = {
	type: 'object',
	properties: {
		products: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					title: { type: 'string', description: 'The exact product listing title' },
					price: { type: 'number', description: 'The product price as a plain number, e.g. 599.99' },
					currency: { type: 'string', description: 'Three-letter ISO currency code, e.g. USD' },
					url: { type: 'string', description: 'Absolute URL of the product listing' },
					imageUrl: { type: 'string', description: 'Absolute URL of the primary product image' },
					rating: { type: 'number', description: 'Average star rating out of 5 (omit if absent)' },
					reviewsCount: { type: 'number', description: 'Number of customer reviews (omit if absent)' },
					condition: { type: 'string', description: 'e.g. New, Used, Refurbished, Open Box' },
					shipping: { type: 'number', description: 'Shipping cost if shown, else 0' }
				},
				required: ['title', 'price', 'currency', 'url']
			}
		}
	},
	required: ['products']
};

export const EXTRACTION_PROMPT =
	'Extract every product card visible on this e-commerce search results page. Only include real, buyable product listings (not sponsored ads, not breadcrumbs, not navigation). For each product capture exact title, price as a number (strip symbols and currency text), currency code if shown, listing URL, image URL, average rating out of 5, review count, product condition, and shipping cost. Do not invent data. Return them all in a "products" array.';