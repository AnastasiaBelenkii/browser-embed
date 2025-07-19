---
description: Understanding embeddings through visualization
---

## What are Embeddings?

While the model loads in the background, let's understand what we're building. Embeddings are dense vector representations of text that capture semantic meaning. Similar concepts end up close together in this high-dimensional space.

<div id="search-component-container">
  <div class="search-container">
    <input type="text" id="search-input" placeholder="Loading model..." aria-label="Semantic search query" disabled />
    <button id="search-button" disabled>Search</button>
    <div id="spinner" class="spinner"></div>
  </div>
  <div id="visualization-container"></div>
  <div id="query-container"></div>
  <div id="corpus-container"></div>
</div>

## How It Works

This demonstration runs entirely client-side, with no server processing. The transformer model processes your text and converts it to a 384-dimensional vector. We then use cosine similarity to find the most related documents.

## Technical Implementation

- **Model**: all-MiniLM-L6-v2 via transformers.js
- **Visualization**: Three.js with PCA dimensionality reduction
- **Architecture**: Web Workers for non-blocking computation

Stay tuned as I add more functionality!
