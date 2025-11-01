<script>
  import '../app.css';
  import { page } from '$app/stores';
  import { base } from '$app/paths';

  // Build breadcrumbs based on current page
  $: breadcrumbs = (() => {
    const crumbs = [{ label: 'Explorations', href: `${base}/` }];
    
    if ($page.params.slug) {
      // We're on a post page
      const postTitles = {
        'semantic-search': 'Semantic Search'
      };
      
      const postTitle = postTitles[$page.params.slug] || $page.params.slug;
      crumbs.push({ label: postTitle, href: null }); // null means current page
    }
    
    return crumbs;
  })();
</script>

<svelte:head>
  <title>Explorations</title>
</svelte:head>

<header id="title-block-header">
  <nav class="breadcrumbs">
    {#each breadcrumbs as crumb, i}
      {#if i > 0}
        <span class="separator">→</span>
      {/if}
      {#if crumb.href}
        <a href={crumb.href}>{crumb.label}</a>
      {:else}
        <span class="current">{crumb.label}</span>
      {/if}
    {/each}
  </nav>
</header>

<article class="content">
  <slot />
</article>

<footer>
  <p>
    <a href="https://github.com/AnastasiaBelenkii/browser-embed" target="_blank" rel="noopener noreferrer">
      Code
    </a>
  </p>
  <p>
    Email me at anastasia@belenky.net with thoughts, feelings, unsolicited advice, and technical suggestions. Anything at all. Please.
  </p>
</footer>
