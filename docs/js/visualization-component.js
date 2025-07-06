import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Three.js Module-level variables ---
let scene, camera, renderer, controls;
let corpusVectorsGroup, queryVectorGroup;
let raycaster, pointer, tooltipElement;
let currentlyIntersected, currentlyHighlighted;

// --- Constants ---
const BASE_COLOR = 0x1f77b4; // Muted blue
const QUERY_COLOR = 0xff7f0e; // Bright orange
const HIGHLIGHT_COLOR = 0xd62728; // Bright red
const HIGHLIGHT_EMISSIVE_COLOR = 0xffff00; // Yellow for outline/glow

/**
 * Initializes the 3D plot using Three.js.
 * @param {string} elementId The ID of the div element to render the plot in.
 */
export function initializeVisualization(elementId) {
    const container = document.getElementById(elementId);
    if (!container) {
        console.error(`Visualization container with id "${elementId}" not found.`);
        return;
    }

    // --- Basic Scene Setup ---
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff); // White background

    const width = container.clientWidth;
    const height = container.clientHeight || 500; // Fallback height

    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(1, 1, 1);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // --- Controls ---
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // --- Axes Helper ---
    const axesHelper = new THREE.AxesHelper(1); // Length of 1 unit
    scene.add(axesHelper);
    
    // --- Origin Marker ---
    const originGeometry = new THREE.SphereGeometry(0.02, 16, 16);
    const originMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black
    const origin = new THREE.Mesh(originGeometry, originMaterial);
    scene.add(origin);

    // --- Raycasting for Tooltips ---
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();
    tooltipElement = document.createElement('div');
    tooltipElement.className = 'tooltip'; // Add a class for styling
    document.body.appendChild(tooltipElement);

    // --- Tooltip CSS ---
    const style = document.createElement('style');
    style.innerHTML = `
        .tooltip {
            position: absolute;
            display: none;
            padding: 8px;
            background-color: rgba(0, 0, 0, 0.75);
            color: white;
            border-radius: 4px;
            pointer-events: none; /* So it doesn't interfere with other mouse events */
            font-family: sans-serif;
            font-size: 14px;
            z-index: 100;
        }
    `;
    document.head.appendChild(style);
    
    // --- Event Listeners ---
    window.addEventListener('resize', onWindowResize);
    container.addEventListener('pointermove', onPointerMove);

    // --- Animation Loop ---
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    const container = renderer.domElement.parentElement;
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function onPointerMove(event) {
    const container = renderer.domElement.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    // Update pointer vector
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Perform raycasting only on mouse move
    raycaster.setFromCamera(pointer, camera);
    const objectsToIntersect = corpusVectorsGroup ? corpusVectorsGroup.children : [];
    const intersects = raycaster.intersectObjects(objectsToIntersect, true);
    const vectorHeadIntersects = intersects.filter(i => i.object.userData.isVectorHead);

    if (vectorHeadIntersects.length > 0) {
        const intersectedObject = vectorHeadIntersects[0].object;
        if (currentlyIntersected !== intersectedObject) {
            currentlyIntersected = intersectedObject;
            tooltipElement.style.display = 'block';
            tooltipElement.innerHTML = currentlyIntersected.userData.text;
        }
        tooltipElement.style.left = `${event.clientX + 15}px`;
        tooltipElement.style.top = `${event.clientY}px`;
    } else {
        if (currentlyIntersected) {
            tooltipElement.style.display = 'none';
        }
        currentlyIntersected = null;
    }
}

/**
 * Creates a vector object (line + marker).
 */
function createVector(point, color, text, isQuery = false) {
    const endPoint = new THREE.Vector3(...point);
    const points = [new THREE.Vector3(0, 0, 0), endPoint];
    
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(lineGeometry, lineMaterial);

    const markerGeometry = new THREE.SphereGeometry(0.03, 16, 16);
    const markerMaterial = new THREE.MeshStandardMaterial({ color });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(endPoint);
    
    marker.userData.text = text;
    marker.userData.isVectorHead = true;
    marker.userData.originalColor = color;

    if (isQuery) {
        marker.material.emissive.setHex(HIGHLIGHT_EMISSIVE_COLOR);
        marker.material.emissiveIntensity = 0.7;
    }

    const group = new THREE.Group();
    group.add(line);
    group.add(marker);
    return group;
}

/**
 * Draws the 3D scatter plot of the corpus embeddings.
 * @param {number[][]} corpus3d - An array of 3D points for the corpus.
 * @param {string[]} corpusText - The original text for hover info.
 */
export function plotCorpus(corpus3d, corpusText) {
    if (corpusVectorsGroup) {
        scene.remove(corpusVectorsGroup);
    }
    corpusVectorsGroup = new THREE.Group();

    corpus3d.forEach((p, i) => {
        const vector = createVector(p, BASE_COLOR, corpusText[i]);
        corpusVectorsGroup.add(vector);
    });

    scene.add(corpusVectorsGroup);
}

/**
 * Adds or updates the query point on the plot.
 * @param {number[]} query3d - The 3D point for the query.
 * @param {string} queryText - The original query text for hover info.
 */
export function plotQuery(query3d, queryText) {
    if (queryVectorGroup) {
        scene.remove(queryVectorGroup);
    }
    queryVectorGroup = createVector(query3d, QUERY_COLOR, queryText, true);
    scene.add(queryVectorGroup);
}

/**
 * Highlights a specific point in the corpus plot.
 * @param {number} pointIndex - The index of the point to highlight. A negative index clears the highlight.
 */
export function highlightPoint(pointIndex) {
    // Reset previously highlighted vector
    if (currentlyHighlighted) {
        const marker = currentlyHighlighted.children.find(c => c.isMesh);
        if (marker) {
            marker.material.color.setHex(marker.userData.originalColor);
            marker.material.emissive.setHex(0x000000);
        }
        currentlyHighlighted = null;
    }

    if (pointIndex < 0 || !corpusVectorsGroup || pointIndex >= corpusVectorsGroup.children.length) {
        return;
    }

    // Highlight the new vector
    const vectorToHighlight = corpusVectorsGroup.children[pointIndex];
    const markerToHighlight = vectorToHighlight.children.find(c => c.isMesh);

    if (markerToHighlight) {
        markerToHighlight.material.color.setHex(HIGHLIGHT_COLOR);
        markerToHighlight.material.emissive.setHex(HIGHLIGHT_EMISSIVE_COLOR);
        markerToHighlight.material.emissiveIntensity = 0.7;
        currentlyHighlighted = vectorToHighlight;
    }
}
