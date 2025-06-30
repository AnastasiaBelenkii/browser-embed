// This script initializes the embedding worker and provides a simple interface for interacting with it.

// Create a new worker
const worker = new Worker(new URL('./embedding-worker.js', import.meta.url), {
    type: 'module'
});

// Store promises for embedding requests
const embeddingPromises = new Map();
let nextId = 0;

/**
 * A function to request an embedding from the worker.
 * @param {string | string[]} text The text or array of texts to embed.
 * @returns {Promise<any>} A promise that resolves with the embedding result.
 */
export function requestEmbedding(text) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
        // Store the promise resolvers
        embeddingPromises.set(id, { resolve, reject });
        // Post the message to the worker
        worker.postMessage({ type: 'embed', text, id });
    });
}

// Listen for messages from the worker
worker.onmessage = (event) => {
    const { type, id, embedding, error } = event.data;

    switch (type) {
        case 'ready':
            // The model is loaded and ready. Notify the application.
            console.log('Embedding worker is ready.');
            document.dispatchEvent(new CustomEvent('model-ready'));
            break;
        
        case 'complete':
            // An embedding request was completed successfully.
            if (embeddingPromises.has(id)) {
                embeddingPromises.get(id).resolve(embedding);
                embeddingPromises.delete(id);
            }
            break;

        case 'error':
            // An error occurred in the worker.
            console.error('Worker error:', error);
            // If it's a general error, notify the whole app.
            if (id === undefined) {
                document.dispatchEvent(new CustomEvent('model-error', { detail: error }));
            } else if (embeddingPromises.has(id)) {
                // If it's an error for a specific request, reject that promise.
                embeddingPromises.get(id).reject(new Error(error));
                embeddingPromises.delete(id);
            }
            break;
    }
};

worker.onerror = (error) => {
    console.error('A critical error occurred in the embedding worker:', error);
    document.dispatchEvent(new CustomEvent('model-error', { detail: error.message }));
};
