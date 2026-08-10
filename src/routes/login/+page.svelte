<script lang="ts">
  import { goto } from '$app/navigation';
  import { asset } from '$app/paths';

  let username = $state('Ali Haydar');
  let password = $state('');
  let errorMessage = $state('');
  let isSubmitting = $state(false);

  const login = async (event: SubmitEvent) => {
    event.preventDefault();
    errorMessage = '';
    isSubmitting = true;

    try {
      const response = await fetch('/auth/login', {
        body: JSON.stringify({ password, username }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST'
      });

      if (!response.ok) {
        errorMessage = 'The username or password is incorrect.';
        password = '';
        return;
      }

      await goto('/');
    } catch {
      errorMessage = 'Unable to connect. Please try again.';
    } finally {
      isSubmitting = false;
    }
  };
</script>

<svelte:head>
  <title>Sign in · Diagram Studio</title>
  <meta
    name="description"
    content="Sign in to your private Diagram Studio workspace." />
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
  <div class="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
    <div class="mb-8 text-center">
      <img
        class="mx-auto mb-5 size-20 rounded-2xl"
        src={asset('/diagram-studio-icon.png')}
        alt="Diagram Studio" />
      <h1 class="text-2xl font-semibold tracking-tight text-white">Welcome to Diagram Studio</h1>
      <p class="mt-2 text-sm text-slate-400">Sign in to your private diagram workspace.</p>
    </div>

    <form class="space-y-5" onsubmit={login}>
      <label class="block space-y-2">
        <span class="text-sm font-medium text-slate-200">Username</span>
        <input
          class="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
          autocomplete="username"
          bind:value={username}
          required />
      </label>

      <label class="block space-y-2">
        <span class="text-sm font-medium text-slate-200">Password</span>
        <input
          class="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
          type="password"
          autocomplete="current-password"
          bind:value={password}
          required />
      </label>

      {#if errorMessage}
        <p class="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-200">
          {errorMessage}
        </p>
      {/if}

      <button
        class="h-11 w-full rounded-lg bg-blue-600 font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>

    <p class="mt-6 text-center text-xs text-slate-500">
      This workspace is self-hosted and access-protected.
    </p>
  </div>
</div>
