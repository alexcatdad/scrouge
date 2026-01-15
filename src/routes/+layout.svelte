<script lang="ts">
  import { setupConvex } from "convex-svelte";
  import "../app.css";

  const { data, children } = $props();

  setupConvex(data.convexUrl);
</script>

{@render children()}
