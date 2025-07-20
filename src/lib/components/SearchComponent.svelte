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
  let isTyping = false; // New state to show immediate feedback
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
  $: canType = !isModelLoading && !isIndexing; // Separate condition for typing
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
      isTyping = false; // Clear typing state when actual search starts
      
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

  // Debounced search function with faster response
  let searchTimeout;
  function handleInput() {
    if (searchTimeout) clearTimeout(searchTimeout);
    
    if (!searchInput.trim()) {
      searchResults = [];
      queryEmbedding = null;
      isTyping = false;
      return;
    }
    
    // Show immediate typing feedback
    if (canSearch) {
      isTyping = true;
    }
    
    // Reduced debounce time for better responsiveness
    searchTimeout = setTimeout(() => {
      performSearch();
    }, 150); // Reduced from 300ms to 150ms
  }

  onMount(async () => {
    if (!browser) return;

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
    />
    {#if searchInput.trim()}
      <button class="clear-btn" on:click={clearSearch} aria-label="Clear search">
        ×
      </button>
    {/if}
  </div>
  {#if isModelLoading || isIndexing || isSearching || isTyping}
    <div class="spinner" class:typing={isTyping}></div>
  {/if}
</div>

{#if queryEmbedding}
  <div id="query-container">
    <h2>Your Query</h2>
    <div class="query-item">
      <div class="query-text">"{searchInput}"</div>
      <div class="corpus-vector-preview">
        [{queryEmbedding.data.slice(0, 4).map(/** @param {number} v */ v => v.toFixed(4)).join(', ')}, ...]
        <button 
          class="toggle-vector-btn"
          on:click={() => showQueryVector = !showQueryVector}
        >
          {showQueryVector ? 'Hide Vector' : 'Show Vector'}
        </button>
      </div>
      {#if showQueryVector}
        <div class="corpus-vector-full">
          [{Array.from(queryEmbedding.data).map(/** @param {number} v */ v => v.toFixed(4)).join(', ')}]
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if corpusEmbeddings}
  <div id="corpus-container">
    <h2>Corpus</h2>
    {#each CORPUS as text, i}
      {@const vector = corpusEmbeddings.data.slice(i * 384, (i + 1) * 384)}
      {@const isHighlight = searchResults.length > 0 && searchResults[0].index === i}
      {@const similarityScore = searchResults.find(r => r.index === i)?.score}
      
      <div 
        class="corpus-item"
        class:highlight={isHighlight}
      >
        <div class="corpus-text">{text}</div>
        <div class="corpus-vector-preview">
          [{vector.slice(0, 4).map(/** @param {number} v */ v => v.toFixed(4)).join(', ')}, ...]
          <button 
            class="toggle-vector-btn"
            on:click={() => toggleVector(`corpus-${i}`)}
          >
            {vectorVisibility[`corpus-${i}`] ? 'Hide Vector' : 'Show Vector'}
          </button>
        </div>
        {#if vectorVisibility[`corpus-${i}`]}
          <div class="corpus-vector-full">
            [{Array.from(vector).map(/** @param {number} v */ v => v.toFixed(4)).join(', ')}]
          </div>
        {/if}
        {#if similarityScore !== undefined}
          <div class="similarity-score">
            Similarity: {similarityScore.toFixed(4)}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .search-container {
    margin: 2rem 0;
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .search-input-wrapper {
    flex-grow: 1;
    position: relative;
    display: flex;
    align-items: center;
  }

  input {
    width: 100%;
    padding: 0.75rem;
    padding-right: 2.5rem;
    border: 2px solid #ccc;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s ease;
  }

  input:focus {
    outline: none;
    border-color: #007bff;
  }

  .clear-btn {
    position: absolute;
    right: 0.5rem;
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #999;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease, background-color 0.2s ease;
  }

  .clear-btn:hover {
    color: #666;
    background-color: #f0f0f0;
  }

  .spinner {
    border: 3px solid rgba(0, 0, 0, 0.1);
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border-left-color: #007bff;
    animation: spin 1s linear infinite;
    flex-shrink: 0;
  }

  .spinner.typing {
    border-left-color: #28a745;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  #corpus-container, #query-container {
    margin-top: 1rem;
  }

  .corpus-item, .query-item {
    padding: 0.75rem;
    border: 2px solid #dee2e6;
    border-radius: 6px;
    margin-bottom: 0.75rem;
    background: #f8f9fa;
    transition: all 0.2s ease-in-out;
  }

  .corpus-item.highlight {
    border-color: #007bff;
    background-color: #e7f1ff;
    transform: scale(1.02);
  }

  .corpus-text, .query-text {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .query-text {
    font-style: italic;
  }

  .corpus-vector-preview {
    font-family: monospace;
    font-size: 0.8rem;
    color: #6c757d;
    word-break: break-all;
  }

  .corpus-vector-full {
    font-family: monospace;
    font-size: 0.8rem;
    color: #495057;
    word-break: break-all;
    background: #e9ecef;
    padding: 0.5rem;
    border-radius: 4px;
    margin-top: 0.5rem;
  }

  .similarity-score {
    font-weight: bold;
    font-family: monospace;
    font-size: 0.9rem;
    color: #0056b3;
    margin-top: 0.5rem;
  }

  .toggle-vector-btn {
    background: none;
    border: none;
    color: #007bff;
    text-decoration: underline;
    cursor: pointer;
    font-size: 0.8rem;
    padding: 0.25rem 0;
    height: auto;
  }

  @media (prefers-color-scheme: dark) {
    input {
      background: #0d1117;
      border-color: #30363d;
      color: #c9d1d9;
    }

    input:focus {
      border-color: #58a6ff;
    }

    .clear-btn {
      color: #8b949e;
    }

    .clear-btn:hover {
      color: #c9d1d9;
      background-color: #30363d;
    }

    .spinner {
      border-left-color: #58a6ff;
    }

    .spinner.typing {
      border-left-color: #7c3aed;
    }

    .corpus-item, .query-item {
      background: #161b22;
      border-color: #30363d;
    }

    .corpus-item.highlight {
      border-color: #58a6ff;
      background-color: #1f2c40;
    }

    .corpus-vector-preview {
      color: #8b949e;
    }

    .corpus-vector-full {
      background: #0d1117;
      color: #c9d1d9;
    }

    .similarity-score {
      color: #79c0ff;
    }

    .toggle-vector-btn {
      color: #58a6ff;
    }
  }
</style>
