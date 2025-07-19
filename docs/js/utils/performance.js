// Lightweight performance tracking utilities
class PerformanceTracker {
    constructor(enabled = false) {
        this.enabled = enabled;
        this.metrics = new Map();
    }

    start(name) {
        if (!this.enabled) return;
        this.metrics.set(name, { start: performance.now() });
    }

    end(name) {
        if (!this.enabled || !this.metrics.has(name)) return;
        
        const metric = this.metrics.get(name);
        metric.end = performance.now();
        metric.duration = metric.end - metric.start;
        
        console.log(`⏱️ ${name}: ${metric.duration.toFixed(2)}ms`);
        return metric.duration;
    }

    measure(name, fn) {
        if (!this.enabled) return fn();
        
        this.start(name);
        const result = fn();
        this.end(name);
        return result;
    }

    async measureAsync(name, fn) {
        if (!this.enabled) return await fn();
        
        this.start(name);
        const result = await fn();
        this.end(name);
        return result;
    }
}

export const perf = new PerformanceTracker(true);
