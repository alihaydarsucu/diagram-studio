<script lang="ts">
  import { asset } from '$app/paths';
  import { goto } from '$app/navigation';
  import {
    duplicateEntry,
    historyState,
    removeEntry,
    toggleFavorite
  } from '$lib/components/History/historyState.svelte';
  import { serializeState } from '$lib/util/serde';
  import { urls } from '$lib/util/state.svelte';
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Input } from '$lib/components/ui/input';
  import * as Popover from '$lib/components/ui/popover';
  import { initHistory } from '$lib/components/History/historyState.svelte';
  import dayjs from 'dayjs';
  import dayjsRelativeTime from 'dayjs/plugin/relativeTime';
  import StarIcon from '~icons/material-symbols/star-rounded';
  import StarOutlineIcon from '~icons/material-symbols/star-outline-rounded';
  import MoreVertIcon from '~icons/material-symbols/more-vert';

  dayjs.extend(dayjsRelativeTime);

  import { onMount } from 'svelte';

  let newProjectOpen = $state(false);
  let newProjectName = $state('Untitled Project');
  let deleteProjectId = $state<string | null>(null);
  let deleteProjectOpen = $state(false);
  let projectSearch = $state('');
  let showFavorites = $state(false);

  const visibleProjects = $derived(
    historyState.allEntries.filter((entry) => {
      const matchesSearch = entry.name?.toLowerCase().includes(projectSearch.trim().toLowerCase());
      return matchesSearch && (!showFavorites || entry.favorite);
    })
  );

  onMount(() => {
    void initHistory();
  });

  const entryUrl = (state: any, name?: string) => {
    const url = new URL('/edit', window.location.origin);
    if (name) {
      url.searchParams.set('projectName', name);
    }
    url.hash = serializeState(state);
    return `${url.pathname}${url.search}${url.hash}`;
  };
  const newProject = () => {
    newProjectName = 'Untitled Project';
    newProjectOpen = true;
  };
  const createProject = () => {
    const url = new URL(urls.current.new, window.location.origin);
    url.searchParams.set('projectName', newProjectName.trim() || 'Untitled Project');
    newProjectOpen = false;
    void goto(`${url.pathname}${url.search}${url.hash}`);
  };
  const confirmDelete = (id: string) => {
    deleteProjectId = id;
    deleteProjectOpen = true;
  };
  const deleteProject = () => {
    if (deleteProjectId) {
      removeEntry(deleteProjectId);
    }
    deleteProjectId = null;
    deleteProjectOpen = false;
  };
</script>

<div class="h-full overflow-y-auto bg-background">
  <nav class="sticky top-0 z-10 border-b bg-card">
    <div class="container mx-auto flex h-16 items-center justify-between px-4">
      <div class="flex items-center gap-2">
        <img class="size-9 rounded-md" src={asset('/diagram-studio.png')} alt="Diagram Studio" />
        <span class="text-xl font-bold tracking-tight text-slate-950 dark:text-slate-100"
          >Diagram Studio</span>
      </div>
      <Button variant="accent" onclick={newProject}>New Project</Button>
    </div>
  </nav>

  <main class="container mx-auto max-w-5xl p-6 sm:p-10">
    <div class="mb-8 flex flex-col gap-2">
      <h1 class="text-3xl font-bold tracking-tight text-foreground">Your Projects</h1>
      <p class="text-muted-foreground">Manage and organize your diagrams</p>
    </div>

    <div class="mb-6 flex w-full max-w-xl items-center gap-2">
      <input
        class="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
        bind:value={projectSearch}
        placeholder="Search projects..."
        aria-label="Search projects" />
      <Button
        variant={showFavorites ? 'accent' : 'outline'}
        size="icon"
        aria-label="Show favorite projects"
        title="Show favorite projects"
        onclick={() => (showFavorites = !showFavorites)}>
        {#if showFavorites}<StarIcon />{:else}<StarOutlineIcon />{/if}
      </Button>
    </div>

    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each visibleProjects as entry (entry.id)}
        <div
          class="group flex flex-col justify-between gap-4 rounded-xl border bg-card p-5 text-card-foreground shadow-sm transition-all hover:border-accent hover:shadow-md">
          <div class="flex flex-col gap-1">
            <div class="flex min-w-0 items-center gap-2">
              <a
                href={entryUrl(entry.state, entry.name)}
                class="truncate text-lg font-semibold hover:text-accent"
                title={entry.name}>{entry.name || 'Untitled Project'}</a>
              <button
                type="button"
                class="shrink-0 rounded p-1 text-amber-500 hover:bg-amber-500/10"
                aria-label={entry.favorite ? 'Remove from favorites' : 'Add to favorites'}
                title={entry.favorite ? 'Remove from favorites' : 'Add to favorites'}
                onclick={() => toggleFavorite(entry.id)}>
                {#if entry.favorite}<StarIcon class="size-4" />{:else}<StarOutlineIcon class="size-4" />{/if}
              </button>
            </div>
            <span class="text-xs text-muted-foreground">{dayjs(entry.time).fromNow()}</span>
          </div>
          <div class="mt-4 flex items-center justify-between border-t pt-4">
            <Button href={entryUrl(entry.state, entry.name)} variant="outline" size="sm"
              >Open Editor</Button>
            <Popover.Root>
              <Popover.Trigger
                class="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
                aria-label="Project actions"
                title="Project actions"><MoreVertIcon class="size-5" /></Popover.Trigger>
              <Popover.Content align="end" class="flex w-40 flex-col gap-1 p-1">
                <Popover.Close
                  class="rounded px-3 py-2 text-left text-sm hover:bg-muted"
                  onclick={() => duplicateEntry(entry.id)}>Duplicate</Popover.Close>
                <Popover.Close
                  class="rounded px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                  onclick={() => confirmDelete(entry.id)}>Delete</Popover.Close>
              </Popover.Content>
            </Popover.Root>
          </div>
        </div>
      {:else}
        <div
          class="col-span-full flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 text-center bg-muted/10">
          <div class="text-muted-foreground">
            <p class="text-lg font-medium">{showFavorites ? 'No favorite projects' : 'No projects found'}</p>
            <p class="text-sm">{showFavorites ? 'Mark a project with the star icon to find it here.' : 'Create your first diagram to get started.'}</p>
          </div>
          <Button variant="accent" class="mt-2" onclick={newProject}>Create New Project</Button>
        </div>
      {/each}
    </div>
  </main>
</div>

<Dialog.Root bind:open={newProjectOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Create new project</Dialog.Title>
      <Dialog.Description>Choose a name for your new diagram project.</Dialog.Description>
    </Dialog.Header>
    <form
      class="flex flex-col gap-4"
      onsubmit={(event) => {
        event.preventDefault();
        createProject();
      }}>
      <Input bind:value={newProjectName} aria-label="Project name" autofocus />
      <Dialog.Footer>
        <Dialog.Close class="rounded-md border px-4 py-2 text-sm">Cancel</Dialog.Close>
        <Button variant="accent" type="submit">Create project</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={deleteProjectOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Delete project?</Dialog.Title>
      <Dialog.Description>This action cannot be undone.</Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Dialog.Close class="rounded-md border px-4 py-2 text-sm">Cancel</Dialog.Close>
      <Button variant="destructive" onclick={deleteProject}>Delete project</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
