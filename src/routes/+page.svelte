<script lang="ts">
  import { asset } from '$app/paths';
  import { goto } from '$app/navigation';
  import {
    duplicateEntry,
    historyState,
    removeEntry,
    toggleFavorite,
    updateTags
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
  import AddIcon from '~icons/material-symbols/add-rounded';
  import CloseIcon from '~icons/material-symbols/close-rounded';

  dayjs.extend(dayjsRelativeTime);

  import { onMount } from 'svelte';

  let newProjectOpen = $state(false);
  let newProjectName = $state('Untitled Project');
  let deleteProjectId = $state<string | null>(null);
  let deleteProjectOpen = $state(false);
  let projectSearch = $state('');
  let showFavorites = $state(false);
  let activeTag = $state<string | null>(null);
  let tagDialogOpen = $state(false);
  let tagProjectId = $state('');
  let tagInput = $state('');

  const visibleProjects = $derived(
    historyState.allEntries.filter((entry) => {
      const matchesSearch = entry.name?.toLowerCase().includes(projectSearch.trim().toLowerCase());
      const matchesTag = !activeTag || entry.tags?.includes(activeTag);
      return matchesSearch && matchesTag && (!showFavorites || entry.favorite);
    })
  );
  const allTags = $derived(
    [...new Set(historyState.allEntries.flatMap((entry) => entry.tags ?? []))].sort((a, b) =>
      a.localeCompare(b)
    )
  );
  const tagProject = $derived(historyState.allEntries.find((entry) => entry.id === tagProjectId));

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
  const openTagDialog = () => {
    tagProjectId = historyState.allEntries[0]?.id ?? '';
    tagInput = '';
    tagDialogOpen = true;
  };
  const addTag = () => {
    if (!tagProjectId || !tagInput.trim()) {
      return;
    }
    updateTags(tagProjectId, [...(tagProject?.tags ?? []), tagInput]);
    tagInput = '';
  };
  const removeTag = (tag: string) => {
    if (tagProject) {
      updateTags(tagProject.id, (tagProject.tags ?? []).filter((item) => item !== tag));
    }
  };
  const toggleProjectTag = (tag: string) => {
    if (!tagProject) {
      return;
    }
    const tags = tagProject.tags ?? [];
    updateTags(
      tagProject.id,
      tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag]
    );
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
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p class="text-muted-foreground">Manage and organize your diagrams</p>
        <a
          class="text-sm text-accent hover:underline"
          href="https://mermaid.js.org/intro/#diagram-types"
          target="_blank"
          rel="noopener noreferrer">Mermaid Guide ↗</a>
      </div>
    </div>

    <div class="mb-6 flex w-full max-w-4xl flex-wrap items-center gap-2">
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
      {#each allTags as tag (tag)}
        <button
          type="button"
          class={`rounded-full border px-3 py-1.5 text-sm transition ${activeTag === tag ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-card text-muted-foreground hover:border-accent'}`}
          onclick={() => (activeTag = activeTag === tag ? null : tag)}>{tag}</button>
      {/each}
      <Button
        variant="outline"
        size="icon"
        aria-label="Add project tag"
        title="Add project tag"
        onclick={openTagDialog}><AddIcon /></Button>
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
            {#if entry.tags && entry.tags.length > 0}
              <div class="mt-2 flex flex-wrap gap-1">
                {#each entry.tags as tag (tag)}
                  <span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{tag}</span>
                {/each}
              </div>
            {/if}
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
                  class="rounded px-3 py-2 text-left text-sm hover:bg-muted"
                  onclick={() => {
                    tagProjectId = entry.id;
                    tagInput = '';
                    tagDialogOpen = true;
                  }}>Manage tags</Popover.Close>
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

<Dialog.Root bind:open={tagDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Manage project tags</Dialog.Title>
      <Dialog.Description>Use short tags to filter your project dashboard.</Dialog.Description>
    </Dialog.Header>
    <div class="flex flex-col gap-4">
      <select
        class="h-10 rounded-md border border-input bg-background px-3 text-sm"
        bind:value={tagProjectId}
        aria-label="Project to tag">
        {#each historyState.allEntries as project (project.id)}
          <option value={project.id}>{project.name || 'Untitled Project'}</option>
        {/each}
      </select>
      <div class="flex gap-2">
        <Input bind:value={tagInput} placeholder="e.g. Firmware" aria-label="New tag" />
        <Button variant="accent" onclick={addTag}>Add</Button>
      </div>
      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium">Available tags</span>
        <div class="flex flex-wrap gap-2">
          {#each allTags as tag (tag)}
            <button
              type="button"
              class={`rounded-full border px-3 py-1 text-sm transition ${tagProject?.tags?.includes(tag) ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-background hover:border-accent'}`}
              aria-pressed={tagProject?.tags?.includes(tag)}
              onclick={() => toggleProjectTag(tag)}>{tag}</button>
          {:else}
            <span class="text-sm text-muted-foreground">No shared tags yet.</span>
          {/each}
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium">Selected tags</span>
        <div class="flex flex-wrap gap-2">
          {#each tagProject?.tags ?? [] as tag (tag)}
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
              onclick={() => removeTag(tag)}>{tag}<CloseIcon class="size-3.5" /></button>
          {:else}
            <span class="text-sm text-muted-foreground">No tags added yet.</span>
          {/each}
        </div>
      </div>
    </div>
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
