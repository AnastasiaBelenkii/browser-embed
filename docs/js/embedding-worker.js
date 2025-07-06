import { env, pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.5.0/dist/transformers.js';
import { createDimensionalityReducer } from './dimensionality-reducer.js';

// --- Worker Configuration ---
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const TASK = 'feature-extraction';

// Configure environment for worker
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;

// --- State ---
let reducer = null;

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

// --- Helper Functions ---
function reshape(data, dims) {
    if (dims.length === 1) return Array.from(data);
    const rows = dims[0];
    const cols = dims[1];
    const result = [];
    for (let i = 0; i < rows; i++) {
        result.push(Array.from(data.slice(i * cols, (i + 1) * cols)));
    }
    return result;
}

// --- Message Handler ---
self.onmessage = async (event) => {
    const { type, id } = event.data;

    try {
        const embedder = await EmbeddingPipelineSingleton.getInstance();

        switch (type) {
            case 'embed': {
                const { text } = event.data;
                const tensor = await embedder(text, { pooling: 'mean', normalize: true });
                self.postMessage({
                    type: 'complete',
                    id,
                    embedding: { data: tensor.data, dims: tensor.dims, type: tensor.type },
                });
                break;
            }

            case 'reduceCorpus': {
                const { embedding } = event.data;
                reducer = createDimensionalityReducer('pca');
                const corpusMatrix = reshape(embedding.data, embedding.dims);
                const corpus3D = reducer.fit_transform(corpusMatrix);
                self.postMessage({ type: 'corpusReduced', id, corpus3D });
                break;
            }

            case 'projectQuery': {
                const { embedding } = event.data;
                if (!reducer) throw new Error("Reducer has not been initialized. Call 'reduceCorpus' first.");
                const queryMatrix = reshape(embedding.data, embedding.dims);
                const query3D = reducer.transform(queryMatrix);
                self.postMessage({ type: 'queryProjected', id, query3D });
                break;
            }
        }
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
