import { env, pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.5.0/dist/transformers.min.js';

// Configure environment
env.allowLocalModels = false; // Force use of remote models
env.backends.onnx.wasm.numThreads = 1; // Recommended for browser

// Make transformers available globally
window.transformers = {
  pipeline: async (task, model) => {
    console.log(`Loading ${model}...`);
    const pipe = await pipeline(task, model);
    console.log(`Model ${model} loaded!`);
    return pipe;
  }
};
