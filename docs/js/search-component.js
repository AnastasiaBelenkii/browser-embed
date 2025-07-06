// Import the function to interact with the embedding worker and the model ready state
import { requestEmbedding, modelReady, requestCorpusReduction, requestQueryProjection } from './transformers-init.js';
import { initializeVisualization, plotCorpus, plotQuery, highlightPoint } from './visualization-component.js';

// --- State and Data ---
const CORPUS = [
    "The cat sat on the mat.",
    "My dog loves to chase squirrels.",
    "The sun is a star.",
    "Jupiter is the largest planet in our solar system.",
    "I enjoy reading books about history.",
    "She is a talented musician who plays the piano.",
    "The new software update includes several security patches.",
    "To build a web application, you need to know HTML, CSS, and JavaScript.",
    "The stock market experienced a significant downturn.",
    "Economic policy can have a major impact on inflation."
];
let corpusEmbeddings = null;


// --- UI Management ---

function getDOMElements() {
    const button = document.getElementById('search-button');
    const input = document.getElementById('search-input');
    const spinner = document.getElementById('spinner');
    const corpusDiv = document.getElementById('corpus-container');
    const queryDiv = document.getElementById('query-container');
    const vizContainer = document.getElementById('visualization-container');
    if (!button || !input || !spinner || !corpusDiv || !queryDiv || !vizContainer) {
        return null;
    }
    return { button, input, spinner, corpusDiv, queryDiv, vizContainer };
}

function setUIState(state) {
    const elements = getDOMElements();
    if (!elements) return;
    const { button, input, spinner } = elements;
    
    const states = {
        loadingModel: () => {
            input.disabled = true;
            button.disabled = true;
            input.placeholder = 'Loading model...';
            spinner.classList.remove('hidden');
        },
        indexing: () => {
            input.disabled = true;
            button.disabled = true;
            input.placeholder = 'Creating search index...';
            spinner.classList.remove('hidden');
        },
        ready: () => {
            input.disabled = false;
            button.disabled = false;
            input.placeholder = 'Enter search query...';
            spinner.classList.add('hidden');
        },
        searching: () => {
            input.disabled = true;
            button.disabled = true;
            button.textContent = 'Searching...';
            spinner.classList.remove('hidden');
        },
        error: () => {
            input.disabled = true;
            button.disabled = true;
            input.placeholder = 'An error occurred.';
            button.textContent = 'Error';
            spinner.classList.add('hidden');
        }
    };

    if (states[state]) {
        states[state]();
    }
}

function renderCorpus() {
    const { corpusDiv } = getDOMElements();
    corpusDiv.innerHTML = '<h2>Corpus</h2>';
    
    CORPUS.forEach((text, i) => {
        const vector = corpusEmbeddings.data.slice(i * 384, (i + 1) * 384);
        corpusDiv.innerHTML += `
            <div class="corpus-item" id="corpus-item-${i}">
                <div class="corpus-text">${text}</div>
                <div class="corpus-vector-preview">
                    [${vector.slice(0, 4).map(v => v.toFixed(4)).join(', ')}, ...]
                    <button class="toggle-vector-btn" data-target="corpus-vector-full-${i}">Show Vector</button>
                </div>
                <div class="corpus-vector-full hidden" id="corpus-vector-full-${i}">
                    [${Array.from(vector).map(v => v.toFixed(4)).join(', ')}]
                </div>
                <div class="similarity-score" id="similarity-score-${i}"></div>
            </div>
        `;
    });
}

function renderQueryEmbedding(query, embedding) {
    const { queryDiv } = getDOMElements();
    const vector = embedding.data;
    queryDiv.innerHTML = `
        <h2>Your Query</h2>
        <div class="query-item">
            <div class="query-text">"${query}"</div>
            <div class="corpus-vector-preview">
                [${vector.slice(0, 4).map(v => v.toFixed(4)).join(', ')}, ...]
                <button class="toggle-vector-btn" data-target="query-vector-full">Show Vector</button>
            </div>
            <div class="corpus-vector-full hidden" id="query-vector-full">
                [${Array.from(vector).map(v => v.toFixed(4)).join(', ')}]
            </div>
        </div>
    `;
}

function highlightTopResult(searchResults) {
    // Clear previous highlights and scores
    document.querySelectorAll('.corpus-item').forEach(item => {
        item.classList.remove('highlight');
    });
    document.querySelectorAll('.similarity-score').forEach(score => {
        score.textContent = '';
    });

    if (searchResults.length > 0) {
        const topResult = searchResults[0];
        const topItem = document.getElementById(`corpus-item-${topResult.index}`);
        const topScore = document.getElementById(`similarity-score-${topResult.index}`);

        if (topItem && topScore) {
            topItem.classList.add('highlight');
            topScore.textContent = `Similarity: ${topResult.score.toFixed(4)}`;
        }
        // Highlight the point on the 3D graph
        highlightPoint(topResult.index);
    }
}

// --- Core Logic ---

function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normB += vecB[i] * vecB[i];
        normA += vecA[i] * vecA[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function handleSearch() {
  const { input, queryDiv } = getDOMElements();

  try {
    const query = input.value.trim();
    if (!query) {
      queryDiv.innerHTML = ''; // Clear previous query if search is empty
      return;
    }

    setUIState('searching');

    // Generate embedding for the user's query via the worker
    const queryEmbedding = await requestEmbedding(query);
    renderQueryEmbedding(query, queryEmbedding);

    // Project the query into the 3D space and plot it
    const query3D = await requestQueryProjection(queryEmbedding);
    plotQuery(query3D[0], query);

    // Perform the search
    const searchResults = [];
    for (let i = 0; i < CORPUS.length; i++) {
        // Extract the pre-computed embedding for the current corpus item
        const docEmbeddingData = corpusEmbeddings.data.slice(i * 384, (i + 1) * 384);
        const score = cosineSimilarity(queryEmbedding.data, docEmbeddingData);
        searchResults.push({ text: CORPUS[i], score: score, index: i });
    }

    // Sort results by score
    searchResults.sort((a, b) => b.score - a.score);

    // Highlight the top result in the UI and on the graph
    highlightTopResult(searchResults);
    
  } catch (error) {
    console.error('Search failed:', error);
    alert(`Search failed: ${error.message}`);
  } finally {
    setUIState('ready');
    const { button } = getDOMElements();
    button.textContent = 'Search';
  }
}

/**
 * This function is called when the model is ready. It indexes the corpus.
 */
async function onModelReady() {
    setUIState('indexing');
    try {
        // 1. Pre-compute embeddings for the corpus
        corpusEmbeddings = await requestEmbedding(CORPUS);
        renderCorpus();

        // 2. Reduce dimensionality for visualization
        const corpus3D = await requestCorpusReduction(corpusEmbeddings);
        
        // 3. Plot the 3D corpus
        plotCorpus(corpus3D, CORPUS);

        setUIState('ready');
    } catch (error) {
        console.error('Corpus indexing or visualization failed:', error);
        setUIState('error');
    }
}

function setupEventListeners() {
    const elements = getDOMElements();
    if (!elements) {
        throw new Error("Could not set up event listeners, DOM elements not found.");
    }
    const { button, input } = elements;

    button.addEventListener('click', (e) => {
        e.preventDefault();
        handleSearch().catch(console.error);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            button.click();
        }
    });

    // Event delegation for toggle buttons
    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('toggle-vector-btn')) {
            const targetId = e.target.getAttribute('data-target');
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.classList.toggle('hidden');
                e.target.textContent = targetElement.classList.contains('hidden') ? 'Show Vector' : 'Hide Vector';
            }
        }
    });
}

export function initializeSearchComponent() {
    try {
        const elements = getDOMElements();
        if (!elements) {
            throw new Error("Component UI elements not found.");
        }

        setUIState('loadingModel');
        initializeVisualization('visualization-container');
        setupEventListeners();

        // This handles the race condition where the model might be ready
        // before this component's script has loaded and attached its listener.
        if (modelReady) {
            onModelReady();
        } else {
            document.addEventListener('model-ready', onModelReady, { once: true });
        }

        document.addEventListener('model-error', (event) => {
            console.error('Model loading failed, updating UI.', event.detail);
            setUIState('error');
        });

    } catch (error) {
        console.error('CRITICAL: Failed to initialize search component:', error);
        const container = document.querySelector('.search-container');
        if (container) {
            container.innerHTML = `<div class="error" style="width: 100%; text-align: center;">Error: Search component failed to load.</div>`;
        }
    }
}
