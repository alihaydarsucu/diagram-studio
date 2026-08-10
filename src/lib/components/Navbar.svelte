<script lang="ts" module>
  import { logEvent } from '$lib/util/stats';
  import { version } from 'mermaid/package.json';

  void logEvent('version', {
    mermaidVersion: version
  });
</script>

<script lang="ts">
  import { asset, resolve } from '$app/paths';
  import MainMenu from '$/components/MainMenu.svelte';
  import { Separator } from '$/components/ui/separator';
  import type { Snippet } from 'svelte';

  interface Props {
    mobileToggle?: Snippet;
    children: Snippet;
  }

  let { children, mobileToggle }: Props = $props();
</script>

<nav class="z-50 flex p-4 sm:p-6">
  <div class="flex flex-1 items-center gap-2">
    <MainMenu />
    <img class="size-8 rounded-md" src={asset('/diagram-studio-icon.png')} alt="Diagram Studio" />
    <a href={resolve('/', {})} class="whitespace-nowrap text-accent">
      Diagram Studio
    </a>
  </div>
  <div
    id="menu"
    class="hidden flex-nowrap items-center justify-between gap-3 overflow-hidden md:flex">
    <Separator orientation="vertical" />
    {@render children()}
  </div>
  {@render mobileToggle?.()}
</nav>
