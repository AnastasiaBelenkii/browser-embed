/**
 * A component to manage the 3D visualization of embeddings using Plotly.js.
 */

let plotElement = null;
let isInitialized = false;

const BASE_MARKER_COLOR = '#1f77b4';
const BASE_MARKER_SIZE = 5;

const layout = {
    title: 'Corpus and Query Embeddings',
    autosize: true,
    margin: { l: 0, r: 0, b: 0, t: 40 },
    scene: {
        xaxis: { title: 'Dim 1' },
        yaxis: { title: 'Dim 2' },
        zaxis: { title: 'Dim 3' },
    },
};

/**
 * Initializes the 3D plot.
 * @param {string} elementId The ID of the div element to render the plot in.
 */
export function initializeVisualization(elementId) {
    plotElement = document.getElementById(elementId);
    if (!plotElement) {
        console.error(`Visualization container with id "${elementId}" not found.`);
        return;
    }
    // Plotly may not be loaded yet. We'll create the plot when data arrives.
    isInitialized = true;
}

/**
 * Draws the 3D scatter plot of the corpus embeddings.
 * @param {number[][]} corpus3d - An array of 3D points for the corpus.
 * @param {string[]} corpusText - The original text for hover info.
 */
export function plotCorpus(corpus3d, corpusText) {
    if (!isInitialized || !plotElement) return;

    const trace = {
        x: corpus3d.map(p => p[0]),
        y: corpus3d.map(p => p[1]),
        z: corpus3d.map(p => p[2]),
        mode: 'markers',
        type: 'scatter3d',
        name: 'Corpus',
        text: corpusText,
        hoverinfo: 'text',
        marker: {
            size: BASE_MARKER_SIZE,
            color: BASE_MARKER_COLOR,
            opacity: 0.8,
        },
    };

    Plotly.newPlot(plotElement, [trace], layout);
}

/**
 * Adds or updates the query point on the plot.
 * @param {number[]} query3d - The 3D point for the query.
 * @param {string} queryText - The original query text for hover info.
 */
export function plotQuery(query3d, queryText) {
    if (!isInitialized || !plotElement) return;

    const trace = {
        x: [query3d[0]],
        y: [query3d[1]],
        z: [query3d[2]],
        mode: 'markers',
        type: 'scatter3d',
        name: 'Query',
        text: queryText,
        hoverinfo: 'text',
        marker: {
            size: 8,
            color: '#ff7f0e', // Bright orange
            symbol: 'diamond',
        },
    };

    // Check if a 'Query' trace already exists
    const queryTraceIndex = plotElement.data.findIndex(t => t.name === 'Query');

    if (queryTraceIndex > -1) {
        // Update existing trace's data
        Plotly.restyle(plotElement, {
            x: [trace.x],
            y: [trace.y],
            z: [trace.z],
            text: [trace.text]
        }, queryTraceIndex);
    } else {
        // Add the query trace if it doesn't exist
        Plotly.addTraces(plotElement, trace);
    }
}

/**
 * Highlights a specific point in the corpus plot.
 * @param {number} pointIndex - The index of the point to highlight. A negative index clears the highlight.
 */
export function highlightPoint(pointIndex) {
    if (!isInitialized || !plotElement || !plotElement.data || plotElement.data.length === 0) return;

    const corpusTrace = plotElement.data[0];
    const numPoints = corpusTrace.x.length;

    // Reset all points to base style
    const colors = new Array(numPoints).fill(BASE_MARKER_COLOR);
    const sizes = new Array(numPoints).fill(BASE_MARKER_SIZE);

    // Highlight the top result if the index is valid
    if (pointIndex >= 0 && pointIndex < numPoints) {
        colors[pointIndex] = '#d62728'; // Bright red
        sizes[pointIndex] = 10;
    }

    const update = {
        'marker.color': [colors],
        'marker.size': [sizes],
    };

    Plotly.restyle(plotElement, update, 0); // 0 is the index of the corpus trace
}
