<script>
	/** @type {{ sources: Array<string>, onApiKeyChange: (v:string)=>void, hasServerKey: boolean }} */
	let { sources, onApiKeyChange, hasServerKey } = $props();
	let apiKey = $state('');
	let open = $state(false);
</script>

<div class="w-full max-w-4xl mx-auto mt-1 border-2 border-border-term bg-ink">
	<button
		type="button"
		class="flex w-full items-center justify-between gap-2 px-5 py-3 text-left font-mono text-sm text-chalk-dim transition-colors hover:text-chalk"
		onclick={() => (open = !open)}
	>
		<span class="inline-flex items-center gap-2">
			<span class="font-bold text-signal">$</span>
			export FIRECRAWL_API_KEY
		</span>
		<span class="inline-flex items-center gap-2 text-xs">
			{#if hasServerKey}
				<span class="inline-flex items-center gap-1 border border-good/60 bg-good/10 px-2.5 py-0.5 text-good"><span class="h-1.5 w-1.5 rounded-none bg-good"></span>live scraping</span>
			{:else}
				<span class="inline-flex items-center gap-1 border border-signal/60 bg-signal/10 px-2.5 py-0.5 text-signal"><span class="h-1.5 w-1.5 rounded-none bg-signal"></span>key required</span>
			{/if}
			<span class="transition-transform {open ? 'rotate-180' : ''}">▼</span>
		</span>
	</button>

	{#if open}
		<div class="space-y-3 border-t-2 border-dashed border-border-term px-5 py-4">
			<div class="flex flex-col sm:flex-row gap-3">
				<input
					bind:value={apiKey}
					type="password"
					placeholder="fc-your-api-key"
					class="flex-1 border-2 border-border-term bg-ink-soft px-4 py-2.5 font-mono text-sm text-chalk placeholder-chalk-dim outline-none focus:border-signal"
					oninput={(e) => {
						apiKey = /** @type {HTMLInputElement} */ (e.currentTarget).value;
						onApiKeyChange(apiKey);
					}}
				/>
				<a href="https://firecrawl.dev" target="_blank" rel="noreferrer" class="inline-flex items-center justify-center gap-2 border-2 border-border-term px-4 py-2.5 font-mono text-sm text-chalk transition-colors hover:border-signal hover:text-signal">
					get a free key ↗
				</a>
			</div>
			<p class="font-mono text-xs text-chalk-dim">
				<span class="text-signal">//</span> key is sent only to this app's <code class="border border-border-term bg-ink-soft px-1">/api/scrape</code> endpoint. add
				<code class="border border-border-term bg-ink-soft px-1 text-signal">FIRECRAWL_API_KEY</code> to <code class="border border-border-term bg-ink-soft px-1">.env</code> to keep it server-side.
			</p>
			{#each sources as source}
				<div class="flex items-center gap-2 border border-border-term bg-ink px-3 py-2 font-mono text-xs text-chalk-dim">
					<span class="text-signal">▸</span>
					<span>{source}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>