<script>
	/** @type {{ sources: Array<string>, onApiKeyChange: (v:string)=>void, hasServerKey: boolean }} */
	let { sources, onApiKeyChange, hasServerKey } = $props();
	let apiKey = $state('');
	let open = $state(false);
</script>

<div class="w-full max-w-4xl mx-auto mt-1 rounded-2xl border border-slate-800 bg-slate-900/40">
	<button
		type="button"
		class="flex w-full items-center justify-between gap-2 px-5 py-3 text-left text-sm text-slate-400 transition-colors hover:text-slate-200"
		onclick={() => (open = !open)}
	>
		<span class="inline-flex items-center gap-2">
			<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
			Firecrawl API Key
		</span>
		<span class="inline-flex items-center gap-2 text-xs">
			{#if hasServerKey}
				<span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-emerald-300"><span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>Live scraping</span>
			{:else}
				<span class="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-amber-300"><span class="h-1.5 w-1.5 rounded-full bg-amber-400"></span>Key required</span>
			{/if}
			<svg class="w-4 h-4 transition-transform {open ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
		</span>
	</button>

	{#if open}
		<div class="space-y-3 border-t border-slate-800 px-5 py-4">
			<div class="flex flex-col sm:flex-row gap-3">
				<input
					bind:value={apiKey}
					type="password"
					placeholder="fc-your-api-key"
					class="flex-1 rounded-xl border border-slate-700/60 bg-slate-900/70 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-violet-500/70 focus:ring-4 focus:ring-violet-500/20"
					oninput={(e) => {
						apiKey = /** @type {HTMLInputElement} */ (e.currentTarget).value;
						onApiKeyChange(apiKey);
					}}
				/>
				<a href="https://firecrawl.dev" target="_blank" rel="noreferrer" class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700/60 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:border-violet-500/60 hover:text-violet-300">
					Get a free key
					<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6v6M10 14l10-10" /></svg>
				</a>
			</div>
			<p class="text-xs text-slate-500">Your key is sent to this app's server endpoint only and scoped to that request. Add <code class="rounded bg-slate-800 px-1 py-0.5 text-violet-300">FIRECRAWL_API_KEY</code> to <code class="rounded bg-slate-800 px-1 py-0.5 text-violet-300">.env</code> to keep it server-side permanently.</p>
			{#each sources as source}
				<div class="flex items-center gap-2 rounded-lg bg-slate-800/40 px-3 py-2 text-xs text-slate-400">
					<span class="h-1.5 w-1.5 rounded-full bg-violet-400"></span>
					<span>{source}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>