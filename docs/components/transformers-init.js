import { env, pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.5.0/dist/transformers.min.js';

// Configure environment
env.allowLocalModels = false; // Force use of remote models
env.backends.onnx.wasm.numThreads = 1; // Recommended for browser

// Centralized pipeline promise
let _pipelinePromise = null;

/**
 * Initializes the feature-extraction pipeline.
 * This function is called once and the promise is cached.
 * It dispatches events to notify the UI about the loading status.
 */
function initializePipeline() {
    if (_pipelinePromise) {
        return;
    }
    console.log('Starting model loading...');
    _pipelinePromise = new Promise(async (resolve, reject) => {
        try {
            const pipe = await pipeline(
                'feature-extraction',
                'Xenova/all-MiniLM-L6-v2'
            );
            console.log('Model loaded successfully!');
            document.dispatchEvent(new CustomEvent('model-ready'));
            resolve(pipe);
        } catch (error) {
            console.error('Failed to load model:', error);
            document.dispatchEvent(new CustomEvent('model-error', { detail: error }));
            reject(error);
        }
    });
}

// Make a global accessor for the pipeline
window.transformers = {
  /**
   * Gets the singleton pipeline instance.
   * If it's not already initialized, it will not trigger initialization.
   * It returns a promise that resolves with the pipeline when it's ready.
   * @returns {Promise<Function>} A promise that resolves to the pipeline function.
   */
  getPipeline: () => _pipelinePromise,
};

// Start loading the model as soon as the script is loaded.
initializePipeline();
