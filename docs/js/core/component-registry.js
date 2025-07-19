// Component registration and lifecycle management system
import { perf } from '../utils/performance.js';

class ComponentRegistry {
    constructor() {
        this.components = new Map();
        this.activeComponents = new Set();
        this.loadingPromises = new Map();
    }

    register(name, loader, dependencies = []) {
        this.components.set(name, {
            name,
            loader,
            dependencies,
            loaded: false,
            instance: null
        });
    }

    async loadComponent(name) {
        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }

        const component = this.components.get(name);
        if (!component) {
            throw new Error(`Component '${name}' not found`);
        }

        if (component.loaded) {
            return component.instance;
        }

        const loadingPromise = this._loadComponentInternal(name, component);
        this.loadingPromises.set(name, loadingPromise);
        
        try {
            const result = await loadingPromise;
            this.loadingPromises.delete(name);
            return result;
        } catch (error) {
            this.loadingPromises.delete(name);
            throw error;
        }
    }

    async _loadComponentInternal(name, component) {
        return await perf.measureAsync(`Load component: ${name}`, async () => {
            // Load dependencies first
            for (const dep of component.dependencies) {
                await this.loadComponent(dep);
            }

            // Load the component
            const moduleExports = await component.loader();
            component.instance = moduleExports;
            component.loaded = true;
            
            // Track active component
            this.activeComponents.add(name);
            
            return moduleExports;
        });
    }

    async initializeComponent(name, ...args) {
        const component = await this.loadComponent(name);
        
        if (typeof component.initialize === 'function') {
            return await perf.measureAsync(`Initialize component: ${name}`, () => {
                return component.initialize(...args);
            });
        } else if (typeof component.initializeSearchComponent === 'function') {
            // Backwards compatibility with current naming
            return await perf.measureAsync(`Initialize component: ${name}`, () => {
                return component.initializeSearchComponent(...args);
            });
        }
        
        console.warn(`Component '${name}' has no initialize function`);
    }

    cleanup(name) {
        if (this.activeComponents.has(name)) {
            const component = this.components.get(name);
            if (component?.instance?.cleanup) {
                component.instance.cleanup();
            }
            this.activeComponents.delete(name);
        }
    }

    cleanupAll() {
        for (const name of this.activeComponents) {
            this.cleanup(name);
        }
    }

    getLoadedComponents() {
        return Array.from(this.activeComponents);
    }
}

// Create singleton registry
export const componentRegistry = new ComponentRegistry();

// Register known components
componentRegistry.register(
    'search-component',
    () => import('../search-component.js'),
    [] // No dependencies for now, but ML workers could be listed here
);

// Helper to register new components easily
export function registerComponent(name, loader, dependencies = []) {
    componentRegistry.register(name, loader, dependencies);
}
