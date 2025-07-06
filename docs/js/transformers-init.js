// This script initializes the embedding worker and provides a simple interface for interacting with it.

// Create a new worker
const worker = new Worker(new URL('./embedding-worker.js', import.meta.url), {
    type: 'module'
});

// --- State ---
// Export a state variable to track if the model is ready.
// This helps components that load late handle the case where the 'model-ready' event was already dispatched.
export let modelReady = false;

// Store promises for all types of requests
const promises = new Map();
let nextId = 0;

function makeRequest(payload) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
        promises.set(id, { resolve, reject });
        worker.postMessage({ ...payload, id });
    });
}

/**
 * A function to request an embedding from the worker.
 * @param {string | string[]} text The text or array of texts to embed.
 * @returns {Promise<any>} A promise that resolves with the embedding result.
 */
export function requestEmbedding(text) {
    return makeRequest({ type: 'embed', text });
}

/**
 * Requests that the worker perform dimensionality reduction on the entire corpus.
 * @param {object} embedding The full corpus embedding object from a previous request.
 * @returns {Promise<number[][]>} A promise that resolves with the 3D coordinates.
 */
export function requestCorpusReduction(embedding) {
    return makeRequest({ type: 'reduceCorpus', embedding });
}

/**
 * Requests that the worker project a single query embedding into the existing 3D space.
 * @param {object} embedding The query embedding object.
 * @returns {Promise<number[][]>} A promise that resolves with the single 3D coordinate.
 */
export function requestQueryProjection(embedding) {
    return makeRequest({ type: 'projectQuery', embedding });
}


// Listen for messages from the worker
worker.onmessage = (event) => {
    const { type, id, error } = event.data;
    const promise = promises.get(id);

    if (!promise) return;

    switch (type) {
        case 'ready':
            console.log('Embedding worker is ready.');
            modelReady = true;
            document.dispatchEvent(new CustomEvent('model-ready'));
            break;
        
        case 'complete':
        case 'corpusReduced':
        case 'queryProjected':
            // These are all success cases that return data.
            // The specific data is in event.data (e.g., embedding, corpus3D, query3D)
            promise.resolve(event.data[Object.keys(event.data).find(k => k !== 'type' && k !== 'id')]);
            promises.delete(id);
            break;

        case 'error':
            console.error('Worker error:', error);
            if (id === undefined) {
                document.dispatchEvent(new CustomEvent('model-error', { detail: error }));
            } else {
                promise.reject(new Error(error));
                promises.delete(id);
            }
            break;
    }
};

worker.onerror = (error) => {
    console.error('A critical error occurred in the embedding worker:', error);
    document.dispatchEvent(new CustomEvent('model-error', { detail: error.message }));
};
