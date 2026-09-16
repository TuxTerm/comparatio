<script>
	import { formatCurrency, titleScore } from '$lib/analysis.js';

	/** @typedef {{id:string, price:number, title:string, storeName:string, storeColor?:string, condition?:string, currency?:string}} PricedItem */
	/** @type {{ products: PricedItem[], bestDeal?: PricedItem|null, currency?: string }} */
	let { products, bestDeal, currency = 'USD' } = $props();

	/** @param {number[]} arr @param {number} q */
	function percentile(arr, q) {
		if (!arr.length) return 0;
		const sorted = [...arr].sort((a, b) => a - b);
		const pos = (sorted.length - 1) * q;
		const base = Math.floor(pos);
		const rest = pos - base;
		return sorted[base] + (sorted[base + 1] !== undefined ? rest * (sorted[base + 1] - sorted[base]) : 0);
	}

	const priced = $derived(products.filter((p) => p.price > 0).sort((a, b) => a.price - b.price));

	let bins = $derived.by(() => {
		if (!priced.length) return [];
		const min = priced[0].price;
		const max = priced[priced.length - 1].price;
		const span = max - min;
		if (span < 0.01) return [{ label: formatCurrency(max, currency), count: priced.length, lo: min, hi: max, items: priced, percent: 100 }];
		const width = span < 50 ? 10 : span < 500 ? 50 : span < 5000 ? 250 : 1000;
		const nBins = Math.min(10, Math.ceil(span / width));
		const actualWidth = Math.ceil(span / nBins);
		const res = [];
		for (let i = 0; i < nBins; i++) {
			const lo = min + i * actualWidth;
			const hi = i === nBins - 1 ? max + 0.001 : min + (i + 1) * actualWidth;
			const items = priced.filter((p) => p.price >= lo && p.price < hi);
			res.push({ label: formatCurrency(lo, currency), count: items.length, lo, hi, items, percent: 0 });
		}
		const maxCount = Math.max(...res.map((b) => b.count));
		for (const b of res) b.percent = maxCount ? (b.count / maxCount) * 100 : 0;
		return res;
	});

	let hover = $state(null);
	const W = 640;
	const H = 220;
	const PAD = { top: 14, right: 12 };

	const chartH = $derived(H - PAD.top);
	/** @param {number} pct */
	function yFor(pct) {
		return PAD.top + chartH - (chartH * pct) / 100;
	}

	let tooltip = $derived.by(() => {
		const id = hover;
		if (!id) return null;
		const item = priced.find((p) => p.id === id) || bestDeal;
		if (!item) return null;
		return item;
	});

	const pricingSummary = $derived.by(() => {
		if (!priced.length) return 'No pricing data';
		const q1 = percentile(priced.map((p) => p.price), 0.25);
		const q3 = percentile(priced.map((p) => p.price), 0.75);
		const total = priced.length;
		const inRange = priced.filter((p) => p.price >= q1 && p.price <= q3).length;
		return `${total} listings · ${((inRange / total) * 100).toFixed(0)}% fall in the typical ${formatCurrency(q1, currency)} – ${formatCurrency(q3, currency)} range`;
	});
</script>

<div class="w-full rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-semibold text-slate-200">Price Distribution</h3>
		<div class="flex items-center gap-2 text-xs text-slate-400">
			<span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-violet-500"></span>Listings</span>
			<span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>Best Deal</span>
		</div>
	</div>

	{#if priced.length}
		<div class="relative mt-4">
			<svg viewBox="0 0 {W} {H}" class="w-full">
				{#each [0, 1, 2, 3, 4] as i}
					{@const pct = /** @type {number} */ (i * 25)}
					<line x1="{PAD.right}" y1={yFor(pct)} x2="{W - 8}" y2={yFor(pct)} class="stroke-slate-800" stroke-dasharray="3 4" />
					{#if pct === 75 || pct === 25}
						<text x="{PAD.right - 6}" y={yFor(pct) + 3} class="fill-slate-600" font-size="9" text-anchor="end">{pct}%</text>
					{/if}
				{/each}

				{#each bins as bin, i}
					{@const bw = (W - PAD.right - 14) / bins.length}
					{@const bx = 14 + i * bw}
					{@const by = yFor(bin.percent)}
					{#if bin.count}
						<rect x={bx + 2} y={by} width={bw - 6} height={chartH - by + PAD.top - 2} rx="5" class="fill-violet-500/70 transition-all hover:fill-violet-400" />
					{/if}
				{/each}

				{#if bestDeal}
					{@const bdPrice = bestDeal.price}
					{@const bdIndex = priced.findIndex((p) => p.price >= bdPrice)}
					{#if bdIndex >= 0}
						{@const bw = (W - PAD.right - 14) / bins.length}
						{@const cx = 14 + bdIndex * bw + bw / 2}
						<line x1={cx} y1={PAD.top} x2={cx} y2={H - 4} stroke="#34d399" stroke-width="2" stroke-dasharray="5 4" />
					{/if}
				{/if}
			</svg>

			<div class="mt-2 flex flex-wrap items-center gap-1 font-mono text-[10px] text-slate-400">
				<span class="text-emerald-300">▲</span>
				<span>{pricingSummary}</span>
			</div>
		</div>
	{:else}
		<div class="mt-4 flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-800 text-sm text-slate-500">No pricing data to chart</div>
	{/if}

	{#if tooltip}
		<div class="mt-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs">
			<div class="flex items-center justify-between gap-3">
				<span class="line-clamp-1 font-medium text-slate-200">{tooltip.title}</span>
				<span class="shrink-0 font-bold text-emerald-300">{formatCurrency(tooltip.price, tooltip.currency || currency)}</span>
			</div>
			<span class="text-slate-500">{tooltip.storeName} · {tooltip.condition || 'Sale'}</span>
		</div>
	{/if}
</div>