<script>
  import '../app.css';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
</script>

<svelte:head>
  <title>Explorations</title>
</svelte:head>

<header id="title-block-header">
  <nav id="blog-nav">
    <a href="{base}/">Home</a>
    <a href="{base}/semantic-search">Semantic Search</a>
  </nav>
  <h1 class="title">Interactive ML Blog</h1>
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
