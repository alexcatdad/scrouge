<script lang="ts">
	const { children } = $props();
</script>

<div class="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
	<div class="w-full max-w-md p-8">
		{@render children()}
	</div>
</div>
