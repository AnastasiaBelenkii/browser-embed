import { browser } from '$app/environment';

// Worker and state management
let worker = null;
let modelReady = false;
let isInitialized = false;

// Store promises for embedding requests
const embeddingPromises = new Map();
let nextId = 0;

export function requestEmbedding(text) {
  if (!worker) {
    throw new Error('Transformers worker not initialized');
  }

  const id = nextId++;
  return new Promise((resolve, reject) => {
    embeddingPromises.set(id, { resolve, reject });
    worker.postMessage({ type: 'embed', text, id });
  });
}

export async function initializeTransformers() {
  if (!browser) {
    return { modelReady: false, modelError: false };
  }

  if (isInitialized) {
    return { modelReady, modelError: false };
  }

  // Create worker
  worker = new Worker(new URL('./embedding-worker.js', import.meta.url), {
    type: 'module'
  });

  // Listen for messages from the worker
  worker.onmessage = (event) => {
    const { type, id, embedding, error } = event.data;

    switch (type) {
      case 'ready':
        console.log('Embedding worker is ready.');
        modelReady = true;
        document.dispatchEvent(new CustomEvent('model-ready'));
        break;
      
      case 'complete':
        if (embeddingPromises.has(id)) {
          embeddingPromises.get(id).resolve(embedding);
          embeddingPromises.delete(id);
        }
        break;

      case 'error':
        console.error('Worker error:', error);
        if (id === undefined) {
          document.dispatchEvent(new CustomEvent('model-error', { detail: error }));
        } else if (embeddingPromises.has(id)) {
          embeddingPromises.get(id).reject(new Error(error));
          embeddingPromises.delete(id);
        }
        break;
    }
  };

  worker.onerror = (error) => {
    console.error('Critical worker error:', error);
    document.dispatchEvent(new CustomEvent('model-error', { detail: error.message }));
  };

  isInitialized = true;
  return { modelReady, modelError: false };
}
