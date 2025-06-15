import { env, pipeline, AutoTokenizer, AutoModel, AutoConfig } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.5.0/dist/transformers.min.js';

// Configuration
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const TASK = 'feature-extraction';

// Configure environment
env.allowLocalModels = false; // Force use of remote models
env.backends.onnx.wasm.numThreads = 1; // Recommended for browser

/**
 * Initializes the pipeline, tokenizer, and model.
 * This function is called once and dispatches events to notify the UI.
 */
async function initialize() {
    try {
        console.log('Starting model and tokenizer loading...');
        
        // 1. Load the model's configuration and update it to output attentions and hidden states
        const config = await AutoConfig.from_pretrained(MODEL_NAME);
        config.output_hidden_states = true;
        config.output_attentions = true;

        // 2. Load the tokenizer
        const tokenizer = await AutoTokenizer.from_pretrained(MODEL_NAME);

        // 3. Load the model, passing the modified configuration
        const model = await AutoModel.from_pretrained(MODEL_NAME, { config });

        // 4. Create a pipeline for convenience, reusing the loaded model and tokenizer
        const pipe = await pipeline(TASK, MODEL_NAME, {
            tokenizer,
            model,
        });

        console.log('Model, tokenizer, and pipeline loaded successfully!');
        
        // 5. Dispatch the event with all necessary components
        document.dispatchEvent(new CustomEvent('model-ready', { 
            detail: { 
                pipeline: pipe,
                tokenizer: tokenizer,
                model: model,
            } 
        }));

    } catch (error) {
        console.error('Failed to load model:', error);
        document.dispatchEvent(new CustomEvent('model-error', { detail: error }));
    }
}

// Start loading as soon as the script is loaded.
initialize();
