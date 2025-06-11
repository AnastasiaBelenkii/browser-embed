import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.5.0/dist/transformers.min.js';

// Make pipeline available globally since we're mixing module and non-module code
window.transformers = { pipeline };
