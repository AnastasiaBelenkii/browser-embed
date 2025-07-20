import { env, pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.5.0/dist/transformers.js';

// --- Worker Configuration ---
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const TASK = 'feature-extraction';

// Configure environment for worker
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;

// --- Singleton Class for Pipeline ---
// Ensures the model is loaded only once.
class EmbeddingPipelineSingleton {
    static task = TASK;
    static model = MODEL_NAME;
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

// --- Message Handler ---
self.onmessage = async (event) => {
    const { type, text, id } = event.data;

    // We only support 'embed' messages.
    if (type !== 'embed') {
        return;
    }

    try {
        // Retrieve the pipeline. This will load it if it's not already loaded.
        const embedder = await EmbeddingPipelineSingleton.getInstance();

        // Generate the embedding. This returns a Tensor object.
        const tensor = await embedder(text, { pooling: 'mean', normalize: true });

        // Extract the raw data from the Tensor into a plain, clonable object.
        const embedding = {
            data: tensor.data,
            dims: tensor.dims,
            type: tensor.type,
        };

        // Post the plain object result back to the main thread.
        self.postMessage({
            type: 'complete',
            id,
            embedding,
        });

    } catch (error) {
        self.postMessage({
            type: 'error',
            id,
            error: error.message,
        });
    }
};

// --- Initial Model Loading ---
// Immediately attempt to load the model and notify the main thread when ready.
(async () => {
    try {
        await EmbeddingPipelineSingleton.getInstance((data) => {
            // Optional: Post progress updates to the main thread
            // self.postMessage({ type: 'progress', data });
        });
        self.postMessage({ type: 'ready' });
    } catch (error) {
        self.postMessage({ type: 'error', error: error.message });
    }
})();
