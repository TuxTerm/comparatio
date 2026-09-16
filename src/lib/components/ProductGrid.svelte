<script>
	import { formatCurrency } from '$lib/analysis.js';

	/** @typedef {{id:string, title:string, price:number, currency?:string, storeName:string, storeId?:string, storeColor?:string, condition?:string, rating?:number|null, reviewsCount?:number|null, url:string, imageUrl?:string, shipping?:number, shipsFrom?:string}} ProductRow */
	/** @type {{ products: ProductRow[], currency?: string, onSortChange?: (k:string)=>void }} */
	let { products, currency = 'INR', onSortChange } = $props();

	let querySort = $state('price-asc');
	let filterCond = $state('all');
	let filterStore = $state('all');

	const condLabels = $derived([...new Set(products.map((p) => p.condition).filter(Boolean))]);
	const storeLabels = $derived([...new Set(products.map((p) => p.storeName).filter(Boolean))]);

	const computed = $derived.by(() => {
		let list = [...products];
		if (filterStore !== 'all') list = list.filter((p) => p.storeName === filterStore);
		if (filterCond !== 'all') list = list.filter((p) => (p.condition || '').toLowerCase() === filterCond.toLowerCase());
		switch (querySort) {
			case 'price-asc': list.sort((a, b) => a.price - b.price); break;
			case 'price-desc': list.sort((a, b) => b.price - a.price); break;
			case 'rating': list.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
			case 'store': list.sort((a, b) => (a.storeName || '').localeCompare(b.storeName || '')); break;
		}
		return { filtered: list, viewCount: list.length };
	});

	const { filtered, viewCount } = $derived(computed);

	$effect(() => {
		onSortChange?.(querySort);
	});
</script>

<div class="space-y-4">
	{#if !viewCount}
		<div class="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 py-12 text-center text-sm text-slate-500">No products to display — try a different search.</div>
	{:else}
		<div class="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-center gap-2">
				<span class="text-sm font-semibold text-slate-200">{viewCount}</span>
				<span class="text-sm text-slate-400">results</span>
				{#if filterStore !== 'all'}<span class="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">{filterStore}</span>{/if}
				{#if filterCond !== 'all'}<span class="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-300">{filterCond}</span>{/if}
			</div>
			<div class="flex flex-wrap items-center gap-2 text-xs">
				<select bind:value={querySort} class="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-slate-200 outline-none focus:border-violet-500" onchange={(e) => (querySort = /** @type {HTMLSelectElement} */ (e.currentTarget).value)}>
					<option value="price-asc">Price: Low → High</option>
					<option value="price-desc">Price: High → Low</option>
					<option value="rating">Best rating</option>
					<option value="store">Store A → Z</option>
				</select>
				<select bind:value={filterStore} class="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-slate-200 outline-none focus:border-violet-500" onchange={(e) => (filterStore = /** @type {HTMLSelectElement} */ (e.currentTarget).value)}>
					<option value="all">All sources</option>
					{#each storeLabels as s}
						<option value={s}>{s}</option>
					{/each}
				</select>
				<select bind:value={filterCond} class="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-slate-200 outline-none focus:border-violet-500" onchange={(e) => (filterCond = /** @type {HTMLSelectElement} */ (e.currentTarget).value)}>
					<option value="all">All conditions</option>
					{#each condLabels as c}
						<option value={c}>{c}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each filtered as p}
				<article class="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 transition-all hover:border-slate-600 hover:shadow-2xl hover:shadow-black/40">
					<div class="relative flex h-52 items-center justify-center overflow-hidden bg-slate-950/60">
						{#if p.imageUrl}
							<img src={p.imageUrl} alt={p.title} loading="lazy" class="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105" referrerpolicy="no-referrer" onerror={(e) => { /** @type {HTMLImageElement} */ (e.currentTarget).style.display = 'none'; }} />
						{/if}
						{#if !p.imageUrl}
							<span class="text-xs text-slate-600">No image available</span>
						{/if}
						{#if p.storeId}
							<span class="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white" style="background:{p.storeColor || '#8b5cf6'}">
								{p.storeName}
							</span>
						{/if}
						{#if p.shipping && p.shipping > 0}
							<span class="absolute right-3 top-3 rounded-md bg-emerald-500/90 px-2 py-1 text-[10px] font-semibold text-slate-950">+{formatCurrency(p.shipping, p.currency || currency)} ship</span>
						{/if}
					</div>
					<div class="flex flex-1 flex-col gap-1.5 p-4">
						<h4 class="line-clamp-2 text-sm font-medium leading-snug text-slate-100">{p.title}</h4>
						<div class="flex items-baseline gap-2">
							<span class="text-2xl font-extrabold text-emerald-300">{formatCurrency(p.price, p.currency || currency)}</span>
						</div>
						<div class="mt-auto flex items-center justify-between text-xs text-slate-400">
							<span class="inline-flex items-center gap-1">{p.rating != null ? `★ ${p.rating.toFixed(1)}` : '—'}{p.reviewsCount ? ` (${p.reviewsCount})` : ''}</span>
							<span class="rounded-md bg-slate-800 px-2 py-0.5 text-slate-300">{p.condition || 'Sale'}</span>
						</div>
						<a href={p.url} target="_blank" rel="noreferrer" class="mt-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800/70 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-violet-600/30 hover:text-violet-100">
							View on {p.storeName || 'store'} <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6v6M10 14l10-10" /></svg>
						</a>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>