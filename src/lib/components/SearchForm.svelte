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
		<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors">
			<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
		</div>
		<input
			bind:value={inputText}
			type="text"
			placeholder="Search any product — e.g. iPhone 15 Pro, PS5, Nike Air Force 1, iPad Air…"
			class="w-full rounded-2xl border border-slate-700/60 bg-slate-900/70 pl-12 pr-40 py-4 text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-violet-500/70 focus:ring-4 focus:ring-violet-500/20 shadow-2xl shadow-black/40"
		/>
		<div class="absolute right-2 inset-y-2 flex items-center">
			<button disabled={busy} type="submit" class="disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 px-4 sm:px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition-all active:scale-95">
				{#if busy}
					<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
				{:else}
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
				{/if}
				<span>{busy ? 'Scraping…' : 'Find Best Price'}</span>
			</button>
		</div>
	</div>

	<div class="flex flex-wrap items-center justify-center gap-2 pt-1">
		<span class="text-xs font-medium uppercase tracking-wider text-slate-500 mr-1">Scrape:</span>
		{#each stores as store}
			<button
				type="button"
				onclick={() => toggleStore(store)}
				class="inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition-all focus:outline-none {storeSelect.has(store.id) ? 'border-violet-500/70 bg-slate-700/60 text-slate-100 ring-2 ring-violet-500/20' : 'border-slate-700/70 bg-slate-900/50 text-slate-300 hover:border-slate-500/70'}"
			>
				<span class="inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold text-white" style="background:{store.color}">{store.logo}</span>
				<span>{store.name}</span>
				{#if storeSelect.has(store.id)}
					<svg class="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" clip-rule="evenodd"/></svg>
				{/if}
			</button>
		{/each}
	</div>
</form>