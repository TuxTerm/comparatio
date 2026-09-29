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
		<div class="border-2 border-dashed border-border-term bg-ink py-12 text-center font-mono text-sm text-chalk-dim">No products to display — try a different search.</div>
	{:else}
		<div class="flex flex-col gap-3 border-2 border-border-term bg-ink p-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-center gap-2 font-mono">
				<span class="text-sm font-bold text-chalk">{viewCount}</span>
				<span class="text-sm text-chalk-dim">results</span>
				{#if filterStore !== 'all'}<span class="border border-signal bg-signal/10 px-2 py-0.5 text-xs text-signal">[{filterStore}]</span>{/if}
				{#if filterCond !== 'all'}<span class="border border-good bg-good/10 px-2 py-0.5 text-xs text-good">[{filterCond}]</span>{/if}
			</div>
			<div class="flex flex-wrap items-center gap-2 font-mono text-xs">
				<select bind:value={querySort} class="border-2 border-border-term bg-ink px-2.5 py-1.5 text-chalk outline-none focus:border-signal" onchange={(e) => (querySort = /** @type {HTMLSelectElement} */ (e.currentTarget).value)}>
					<option value="price-asc">sort: price ↑</option>
					<option value="price-desc">sort: price ↓</option>
					<option value="rating">sort: rating</option>
					<option value="store">sort: store</option>
				</select>
				<select bind:value={filterStore} class="border-2 border-border-term bg-ink px-2.5 py-1.5 text-chalk outline-none focus:border-signal" onchange={(e) => (filterStore = /** @type {HTMLSelectElement} */ (e.currentTarget).value)}>
					<option value="all">source: all</option>
					{#each storeLabels as s}
						<option value={s}>source: {s}</option>
					{/each}
				</select>
				<select bind:value={filterCond} class="border-2 border-border-term bg-ink px-2.5 py-1.5 text-chalk outline-none focus:border-signal" onchange={(e) => (filterCond = /** @type {HTMLSelectElement} */ (e.currentTarget).value)}>
					<option value="all">state: all</option>
					{#each condLabels as c}
						<option value={c}>state: {c}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each filtered as p}
				<article class="term-card term-card-hover group flex flex-col overflow-hidden">
					<div class="relative flex h-52 items-center justify-center overflow-hidden bg-ink-line">
						{#if p.imageUrl}
							<img src={p.imageUrl} alt={p.title} loading="lazy" class="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105" referrerpolicy="no-referrer" onerror={(e) => { /** @type {HTMLImageElement} */ (e.currentTarget).style.display = 'none'; }} />
						{/if}
						{#if !p.imageUrl}
							<span class="font-mono text-xs text-chalk-dim">[no image]</span>
						{/if}
						{#if p.storeId}
							<span class="absolute left-3 top-3 inline-flex items-center gap-1 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-ink" style="background:{p.storeColor || '#cba6f7'}">
								{p.storeName}
							</span>
						{/if}
						{#if p.shipping && p.shipping > 0}
							<span class="absolute right-3 top-3 bg-good px-2 py-1 font-mono text-[10px] font-semibold text-ink">+{formatCurrency(p.shipping, p.currency || currency)} ship</span>
						{/if}
					</div>
					<div class="flex flex-1 flex-col gap-1.5 p-4">
						<h4 class="line-clamp-2 font-mono text-sm leading-snug text-chalk">{p.title}</h4>
						<div class="flex items-baseline gap-2">
							<span class="font-mono text-2xl font-bold text-signal">{formatCurrency(p.price, p.currency || currency)}</span>
						</div>
						<div class="mt-auto flex items-center justify-between font-mono text-xs text-chalk-dim">
							<span class="inline-flex items-center gap-1">{p.rating != null ? `★ ${p.rating.toFixed(1)}` : '—'}{p.reviewsCount ? ` (${p.reviewsCount})` : ''}</span>
							<span class="border border-chalk-dim px-2 py-0.5 text-chalk">[{p.condition || 'Sale'}]</span>
						</div>
						<a href={p.url} target="_blank" rel="noreferrer" class="mt-1 inline-flex items-center justify-center gap-1.5 border-2 border-border-term px-3 py-2 font-mono text-xs font-bold text-chalk transition-colors group-hover:border-signal group-hover:bg-signal group-hover:text-ink">
							open → {p.storeName || 'store'}
						</a>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>