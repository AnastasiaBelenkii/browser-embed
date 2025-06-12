import { env, pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.5.0/dist/transformers.min.js';

// Configuration
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const TASK = 'feature-extraction';

// Configure environment
env.allowLocalModels = false; // Force use of remote models
env.backends.onnx.wasm.numThreads = 1; // Recommended for browser

/**
 * Initializes the feature-extraction pipeline.
 * This function is called once and the promise is cached.
 * It dispatches events to notify the UI about the loading status.
 */
async function initializePipeline() {
    try {
        console.log('Starting model loading...');
        const pipe = await pipeline(TASK, MODEL_NAME);
        console.log('Model loaded successfully!');
        // Dispatch the event with the pipeline instance in the detail
        document.dispatchEvent(new CustomEvent('model-ready', { detail: { pipeline: pipe } }));
    } catch (error) {
        console.error('Failed to load model:', error);
        document.dispatchEvent(new CustomEvent('model-error', { detail: error }));
    }
}

// Start loading the model as soon as the script is loaded.
initializePipeline();
