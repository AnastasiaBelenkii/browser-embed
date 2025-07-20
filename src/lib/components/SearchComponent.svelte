<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { requestEmbedding, initializeTransformers } from '$lib/workers/transformers-init.js';

  // Types (using JSDoc since this is JS, not TS)
  
  /** @typedef {Object} Embedding
   * @property {Float32Array} data
   * @property {number[]} dims
   * @property {string} type
   */
  
  /** @typedef {Object} SearchResult
   * @property {string} text
   * @property {number} score
   * @property {number} index
   */

  // State and Data
  const CORPUS = [
    "The cat sat on the mat.",
    "My dog loves to chase squirrels.",
    "The sun is a star.",
    "Jupiter is the largest planet in our solar system.",
    "I enjoy reading books about history.",
    "She is a talented musician who plays the piano.",
    "The new software update includes several security patches.",
    "To build a web application, you need to know HTML, CSS, and JavaScript.",
    "The stock market experienced a significant downturn.",
    "Economic policy can have a major impact on inflation."
  ];

  // Reactive state with proper initial types
  let searchInput = '';
  let isModelLoading = true;
  let isIndexing = false;
  let isSearching = false;
  let hasError = false;
  let isTyping = false;
  /** @type {Embedding | null} */
  let corpusEmbeddings = null;
  /** @type {SearchResult[]} */
  let searchResults = [];
  /** @type {Embedding | null} */
  let queryEmbedding = null;
  let showQueryVector = false;
  /** @type {Record<string, boolean>} */
  let vectorVisibility = {};

  // Computed properties
  $: canSearch = !isModelLoading && !isIndexing && corpusEmbeddings;
  $: canType = !isModelLoading && !isIndexing;
  $: placeholder = isModelLoading ? 'Loading model...' : 
                   isIndexing ? 'Creating search index...' : 
                   hasError ? 'An error occurred.' : 
                   'Search semantic space...';

  /**
   * @param {number[] | Float32Array} vecA
   * @param {number[] | Float32Array} vecB
   * @returns {number}
   */
  function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async function performSearch() {
    if (!canSearch || !searchInput.trim()) {
      searchResults = [];
      queryEmbedding = null;
      return;
    }

    try {
      isSearching = true;
      isTyping = false;
      
      // Generate embedding for the user's query
      queryEmbedding = await requestEmbedding(searchInput.trim());
      
      // Perform the search
      /** @type {SearchResult[]} */
      const results = [];
      for (let i = 0; i < CORPUS.length; i++) {
        const docEmbeddingData = corpusEmbeddings.data.slice(i * 384, (i + 1) * 384);
        const score = cosineSimilarity(queryEmbedding.data, docEmbeddingData);
        results.push({ text: CORPUS[i], score: score, index: i });
      }

      // Sort results by score
      results.sort((a, b) => b.score - a.score);
      searchResults = results;

    } catch (error) {
      console.error('Search failed:', error);
      hasError = true;
    } finally {
      isSearching = false;
    }
  }

  async function onModelReady() {
    try {
      isIndexing = true;
      corpusEmbeddings = await requestEmbedding(CORPUS);
      isIndexing = false;
    } catch (error) {
      console.error('Corpus indexing failed:', error);
      hasError = true;
      isIndexing = false;
    }
  }

  /**
   * @param {any} error
   */
  function onModelError(error) {
    console.error('Model loading failed:', error);
    hasError = true;
    isModelLoading = false;
    isIndexing = false;
  }

  /**
   * @param {string} id
   */
  function toggleVector(id) {
    vectorVisibility = { ...vectorVisibility, [id]: !vectorVisibility[id] };
  }

  function clearSearch() {
    searchInput = '';
    searchResults = [];
    queryEmbedding = null;
    isTyping = false;
    if (searchTimeout) clearTimeout(searchTimeout);
  }

  // Debounced search function optimized for immediate input response
  let searchTimeout;
  function handleInput() {
    // Only do minimal synchronous work to avoid blocking input
    if (searchTimeout) clearTimeout(searchTimeout);
    
    // Defer all other work to next frame for immediate input response
    requestAnimationFrame(() => {
      const trimmedInput = searchInput.trim();
      
      if (!trimmedInput) {
        searchResults = [];
        queryEmbedding = null;
        isTyping = false;
        return;
      }
      
      // Show immediate typing feedback
      if (canSearch) {
        isTyping = true;
      }
      
      // Schedule search with debounce
      searchTimeout = setTimeout(() => {
        performSearch();
      }, 150);
    });
  }

  // Initialize transformers with better performance characteristics
  async function initializeTransformersOptimized() {
    try {
      const { modelReady } = await initializeTransformers();
      
      if (modelReady) {
        isModelLoading = false;
        await onModelReady();
      } else {
        // Listen for model ready event
        const handleModelReady = () => {
          isModelLoading = false;
          onModelReady();
        };
        
        /**
         * @param {CustomEvent} event
         */
        const handleModelError = (event) => {
          onModelError(event.detail);
        };

        document.addEventListener('model-ready', handleModelReady, { once: true });
        document.addEventListener('model-error', handleModelError, { once: true });

        return () => {
          document.removeEventListener('model-ready', handleModelReady);
          document.removeEventListener('model-error', handleModelError);
        };
      }
    } catch (error) {
      console.error('Failed to initialize transformers:', error);
      onModelError(error);
    }
  }

  onMount(async () => {
    if (!browser) return;

    // Defer heavy initialization to avoid blocking initial render
    // Use requestIdleCallback if available, otherwise setTimeout
    const scheduleInit = () => {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => {
          initializeTransformersOptimized();
        }, { timeout: 100 });
      } else {
        setTimeout(() => {
          initializeTransformersOptimized();
        }, 10);
      }
    };

    // Schedule after initial render is complete
    requestAnimationFrame(() => {
      scheduleInit();
    });
  });

  /**
   * @param {KeyboardEvent} event
   */
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      clearSearch();
    }
  }
</script>

<div class="search-container">
  <div class="search-input-wrapper">
    <input
      bind:value={searchInput}
      on:input={handleInput}
      on:keydown={handleKeydown}
      {placeholder}
      aria-label="Semantic search query"
      disabled={!canType}
      class="search-input"
    />
    {#if searchInput.trim()}
      <button class="clear-btn" on:click={clearSearch} aria-label="Clear search">
        ×
      </button>
    {/if}
  </div>
  {#if isModelLoading || isIndexing || isSearching || isTyping}
    <div class="status-indicator" class:typing={isTyping}></div>
  {/if}
</div>

{#if queryEmbedding}
  <div class="query-section">
    <h3>Query</h3>
    <div class="query-item">
      <p class="query-text">"{searchInput}"</p>
      <details class="vector-details">
        <summary>Vector ({queryEmbedding.data.length} dimensions)</summary>
        <pre class="vector-data">[{Array.from(queryEmbedding.data).map(v => v.toFixed(3)).join(', ')}]</pre>
      </details>
    </div>
  </div>
{/if}

{#if corpusEmbeddings}
  <div class="corpus-section">
    <h3>Corpus</h3>
    <div class="corpus-list">
      {#each CORPUS as text, i}
        {@const vector = corpusEmbeddings.data.slice(i * 384, (i + 1) * 384)}
        {@const isTopResult = searchResults.length > 0 && searchResults[0].index === i}
        {@const similarityScore = searchResults.find(r => r.index === i)?.score}
        
        <div class="corpus-item" class:top-result={isTopResult}>
          <p class="corpus-text">{text}</p>
          
          {#if similarityScore !== undefined}
            <div class="similarity-info">
              <span class="similarity-score">similarity: {similarityScore.toFixed(3)}</span>
            </div>
          {/if}
          
          <details class="vector-details">
            <summary>Vector</summary>
            <pre class="vector-data">[{Array.from(vector).map(v => v.toFixed(3)).join(', ')}]</pre>
          </details>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .search-container {
    margin: 3rem 0;
    display: flex;
    gap: 1rem;
    align-items: center;
    /* Optimize for initial render performance */
    contain: layout;
  }

  .search-input-wrapper {
    flex: 1;
    position: relative;
  }

  .search-input {
    width: 100%;
    padding: 0.6rem 0.8rem;
    padding-right: 2.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
    font-family: inherit;
    background: #fff;
    transition: border-color 0.2s ease;
    /* Optimize input performance */
    will-change: border-color;
  }

  .search-input:focus {
    outline: none;
    border-color: #0066cc;
  }

  .search-input:disabled {
    background: #f8f8f8;
    color: #999;
    cursor: not-allowed;
  }

  .clear-btn {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    font-size: 1.2rem;
    color: #999;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 2px;
    line-height: 1;
    /* Optimize button performance */
    will-change: color, background-color;
  }

  .clear-btn:hover {
    color: #666;
    background: #f0f0f0;
  }

  .status-indicator {
    width: 16px;
    height: 16px;
    border: 2px solid #f0f0f0;
    border-top-color: #0066cc;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    /* Optimize spinner performance */
    will-change: transform;
  }

  .status-indicator.typing {
    border-top-color: #28a745;
    animation-duration: 0.8s;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .query-section, .corpus-section {
    margin-top: 2.5rem;
    /* Optimize section rendering */
    contain: layout;
  }

  .query-section h3, .corpus-section h3 {
    margin-bottom: 1rem;
    font-size: 1.1rem;
    font-weight: 600;
    color: #555;
  }

  .corpus-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    /* Optimize list rendering */
    contain: layout;
  }

  .corpus-item {
    padding-bottom: 1rem;
    border-bottom: 1px solid #f5f5f5;
    transition: all 0.2s ease;
    /* Optimize item performance */
    contain: layout;
  }

  .corpus-item:last-child {
    border-bottom: none;
  }

  .corpus-item.top-result {
    padding-left: 0.5rem;
    border-left: 3px solid #0066cc;
    border-bottom-color: #e6f2ff;
    background: #fafcff;
  }

  .query-item {
    padding: 1rem 0;
    border-bottom: 1px solid #f0f0f0;
  }

  .corpus-text, .query-text {
    margin: 0 0 0.8rem 0;
    line-height: 1.5;
  }

  .query-text {
    font-style: italic;
    color: #666;
  }

  .similarity-info {
    margin-bottom: 0.8rem;
  }

  .similarity-score {
    font-size: 0.85rem;
    color: #0066cc;
    font-weight: 500;
    font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace;
  }

  .vector-details {
    margin-top: 0.5rem;
  }

  .vector-details summary {
    font-size: 0.85rem;
    color: #888;
    cursor: pointer;
    padding: 0.2rem 0;
    user-select: none;
  }

  .vector-details summary:hover {
    color: #555;
  }

  .vector-data {
    font-size: 0.75rem;
    color: #666;
    background: #f8f8f8;
    padding: 1rem;
    margin: 0.5rem 0 0 0;
    border-radius: 4px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.4;
    font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace;
    /* Optimize code block performance */
    contain: layout;
  }

  @media (prefers-color-scheme: dark) {
    .search-input {
      background: #1a1a1a;
      border-color: #404040;
      color: #e6e6e6;
    }

    .search-input:focus {
      border-color: #66b3ff;
    }

    .search-input:disabled {
      background: #2a2a2a;
      color: #888;
    }

    .clear-btn {
      color: #888;
    }

    .clear-btn:hover {
      color: #aaa;
      background: #2a2a2a;
    }

    .status-indicator {
      border-color: #333;
      border-top-color: #66b3ff;
    }

    .query-section h3, .corpus-section h3 {
      color: #ccc;
    }

    .corpus-item {
      border-bottom-color: #2a2a2a;
    }

    .corpus-item.top-result {
      border-left-color: #66b3ff;
      border-bottom-color: #1a2332;
      background: #151a20;
    }

    .query-item {
      border-bottom-color: #333;
    }

    .query-text {
      color: #aaa;
    }

    .similarity-score {
      color: #66b3ff;
    }

    .vector-details summary {
      color: #888;
    }

    .vector-details summary:hover {
      color: #aaa;
    }

    .vector-data {
      background: #1a1a1a;
      color: #ccc;
    }
  }
</style>
