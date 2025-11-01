<script>
  import { base } from '$app/paths';
  
  const posts = [
    {
      slug: 'semantic-search',
      title: 'Semantic Search',
      description: 'Understanding embeddings through visualization'
    }
  ];
</script>

<svelte:head>
  <title>Explorations</title>
</svelte:head>

<header class="post-header">
  <h1 class="post-title">Explorations</h1>
  <p class="post-description">Exploring machine learning concepts through interactive demonstrations</p>
</header>

<section>
  <h2>Posts</h2>
  {#each posts as post}
    <div class="post-preview">
      <h3>
        <a href="{base}/{post.slug}">{post.title}</a>
      </h3>
      <p>{post.description}</p>
    </div>
  {/each}
</section>

<style>
  .post-preview {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #eee;
  }
  
  .post-preview h3 {
    margin: 0 0 0.5rem 0;
  }
  
  .post-preview a {
    text-decoration: none;
    color: #007bff;
  }
  
  .post-preview a:hover {
    text-decoration: underline;
  }
  
  .post-preview p {
    margin: 0;
    color: #666;
    font-style: italic;
  }
  
  @media (prefers-color-scheme: dark) {
    .post-preview {
      border-bottom-color: #30363d;
    }
    
    .post-preview a {
      color: #58a6ff;
    }
    
    .post-preview p {
      color: #8b949e;
    }
  }
</style>
