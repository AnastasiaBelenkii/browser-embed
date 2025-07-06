/**
 * A component to manage the 3D visualization of embeddings using Plotly.js.
 */

let plotElement = null;
let isInitialized = false;

const BASE_MARKER_COLOR = '#1f77b4';
const BASE_MARKER_SIZE = 5;
const HIGHLIGHT_COLOR = '#d62728'; // Bright red for fill
const HIGHLIGHT_OUTLINE_COLOR = 'yellow';
const QUERY_COLOR = '#ff7f0e'; // Bright orange

const layout = {
    title: 'Corpus and Query Embeddings',
    autosize: true,
    margin: { l: 0, r: 0, b: 0, t: 40 },
    scene: {
        xaxis: { title: 'Dim 1', range: [-1, 1] },
        yaxis: { title: 'Dim 2', range: [-1, 1] },
        zaxis: { title: 'Dim 3', range: [-1, 1] },
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
    isInitialized = true;
}

/**
 * Draws the 3D scatter plot of the corpus embeddings as vectors from the origin.
 * @param {number[][]} corpus3d - An array of 3D points for the corpus.
 * @param {string[]} corpusText - The original text for hover info.
 */
export function plotCorpus(corpus3d, corpusText) {
    if (!isInitialized || !plotElement) return;

    const lineX = [], lineY = [], lineZ = [], lineText = [], markerSizes = [];
    corpus3d.forEach((p, i) => {
        lineX.push(0, p[0], null);
        lineY.push(0, p[1], null);
        lineZ.push(0, p[2], null);
        lineText.push('', corpusText[i], '');
        markerSizes.push(0, BASE_MARKER_SIZE, 0);
    });

    const trace = {
        x: lineX,
        y: lineY,
        z: lineZ,
        mode: 'lines+markers',
        type: 'scatter3d',
        name: 'Corpus',
        text: lineText,
        hoverinfo: 'text',
        line: {
            color: BASE_MARKER_COLOR,
            width: 2,
        },
        marker: {
            size: markerSizes,
            color: BASE_MARKER_COLOR,
            opacity: 0.8,
        },
    };

    Plotly.newPlot(plotElement, [trace], layout);
}

/**
 * Adds or updates the query point on the plot as a vector from the origin.
 * @param {number[]} query3d - The 3D point for the query.
 * @param {string} queryText - The original query text for hover info.
 */
export function plotQuery(query3d, queryText) {
    if (!isInitialized || !plotElement) return;

    const trace = {
        x: [0, query3d[0]],
        y: [0, query3d[1]],
        z: [0, query3d[2]],
        mode: 'lines+markers',
        type: 'scatter3d',
        name: 'Query',
        text: ['', queryText],
        hoverinfo: 'text',
        line: {
            color: QUERY_COLOR,
            width: 4,
        },
        marker: {
            size: [0, 8],
            color: QUERY_COLOR,
            symbol: 'diamond',
            line: {
                color: HIGHLIGHT_OUTLINE_COLOR,
                width: 2,
            }
        },
    };

    const queryTraceIndex = plotElement.data.findIndex(t => t.name === 'Query');

    if (queryTraceIndex > -1) {
        Plotly.restyle(plotElement, {
            x: [trace.x],
            y: [trace.y],
            z: [trace.z],
            text: [trace.text]
        }, queryTraceIndex);
    } else {
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
    const sizes = new Array(numPoints).fill(0).map((_, i) => (i % 3 === 1 ? BASE_MARKER_SIZE : 0));
    const outlineColors = new Array(numPoints).fill('rgba(0,0,0,0)');
    const outlineWidths = new Array(numPoints).fill(0);

    // Highlight the top result if the index is valid
    if (pointIndex >= 0) {
        const highlightIndex = pointIndex * 3 + 1;
        if (highlightIndex < numPoints) {
            colors[highlightIndex] = HIGHLIGHT_COLOR;
            sizes[highlightIndex] = 10;
            outlineColors[highlightIndex] = HIGHLIGHT_OUTLINE_COLOR;
            outlineWidths[highlightIndex] = 2;
        }
    }

    const update = {
        'marker.color': [colors],
        'marker.size': [sizes],
        'marker.line.color': [outlineColors],
        'marker.line.width': [outlineWidths],
    };

    Plotly.restyle(plotElement, update, 0); // 0 is the index of the corpus trace
}
