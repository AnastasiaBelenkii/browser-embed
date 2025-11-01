<script>
  import { page } from '$app/stores';
  export let data;
</script>

<svelte:head>
  <title>{data.post.metadata.title || data.post.metadata.slug} - Interactive ML Blog</title>
  {#if data.post.metadata.description}
    <meta name="description" content={data.post.metadata.description} />
  {/if}
</svelte:head>

{#if data.post.metadata.title || data.post.metadata.description}
  <header class="post-header">
    {#if data.post.metadata.title}
      <h1 class="post-title">{data.post.metadata.title}</h1>
    {/if}
    {#if data.post.metadata.description}
      <p class="post-description">{data.post.metadata.description}</p>
    {/if}
  </header>
{/if}

<svelte:component this={data.post.default} />
