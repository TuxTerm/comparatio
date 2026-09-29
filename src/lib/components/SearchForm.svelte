<script>
	/** @type {{stores: Array<{id:string,name:string,logo:string,color:string}>, selected: Set<string>, onSubmit: (q:string)=>void, busy: boolean}} */
	let { stores, selected, onSubmit, busy } = $props();
	let inputText = $state('');
	const storeSelect = $derived(selected);

	/**
	 * @param {{id:string,name:string,logo:string,color:string}} store
	 */
	function toggleStore(store) {
		const isOn = storeSelect.has(store.id);
		const next = new Set(storeSelect);
		if (isOn) {
			if (next.size > 1) next.delete(store.id);
		} else {
			next.add(store.id);
		}
		selected = next;
	}

	/** @param {Event} e */
	function submit(e) {
		e.preventDefault();
		if (!inputText.trim()) return;
		onSubmit?.(inputText.trim());
	}
</script>

<form onsubmit={submit} class="w-full max-w-4xl mx-auto space-y-5">
	<div class="relative flex-1">
		<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 font-mono text-lg font-bold text-signal">
			$
		</div>
		<input
			bind:value={inputText}
			type="text"
			placeholder="search any product — e.g. iphone 15, ps5, airpods pro…"
			class="w-full border-2 border-border-term bg-ink-soft pl-8 pr-40 py-4 font-mono text-chalk placeholder-chalk-dim outline-none transition-colors focus:border-signal"
		/>
		<div class="absolute right-2 inset-y-2 flex items-center">
			<button disabled={busy} type="submit" class="disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2 border-2 border-signal bg-signal px-5 py-2.5 font-mono text-sm font-bold text-ink transition-colors hover:bg-transparent hover:text-signal">
				{#if busy}
					<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
				{:else}
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
				{/if}
				<span>{busy ? 'scraping…' : 'find best price'}</span>
			</button>
		</div>
	</div>

	<div class="flex flex-wrap items-center justify-center gap-2 pt-1">
		<span class="mr-1 font-mono text-xs font-medium uppercase tracking-wider text-chalk-dim">[+] scrape:</span>
		{#each stores as store}
			<button
				type="button"
				onclick={() => toggleStore(store)}
				class="inline-flex items-center gap-2 border-2 px-3.5 py-2 font-mono text-sm transition-colors focus:outline-none {storeSelect.has(store.id) ? 'border-signal bg-signal/10 text-chalk' : 'border-border-term bg-ink text-chalk-dim hover:border-signal/70 hover:text-chalk'}"
			>
				<span class="inline-flex h-6 w-6 items-center justify-center text-xs font-bold text-ink" style="background:{store.color}">{store.logo}</span>
				<span>{store.name}</span>
				{#if storeSelect.has(store.id)}
					<span class="text-signal">[x]</span>
				{/if}
			</button>
		{/each}
	</div>
</form>