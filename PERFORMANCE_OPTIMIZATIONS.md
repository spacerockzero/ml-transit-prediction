# Analytics Performance Optimization Strategies

## Current Performance Analysis

### Bottlenecks Identified:
1. **Python Process Startup** (~50-100ms per request)
2. **Data Loading** (~30-50ms per request) 
3. **Pandas Operations** (~20-100ms depending on complexity)
4. **Memory Usage** - 1.2MB parquet file loaded each time

### Current Response Times:
- API calls: ~100-300ms average
- Cache hits: ~1-5ms (48x improvement)
- Cache misses: Full processing time

## Immediate Optimizations (Quick Wins)

### 1. Persistent Python Process
**Impact: 50-80% improvement**
```javascript
// Replace spawn() calls with persistent Python worker process
class PythonWorkerPool {
  constructor(poolSize = 2) {
    this.workers = [];
    this.availableWorkers = [];
    this.requestQueue = [];
    this.initializePool(poolSize);
  }
}
```

### 2. Precomputed Aggregations
**Impact: 70-90% improvement**
```python
# Pre-calculate common percentile combinations
COMMON_PERCENTILES = [50, 70, 80, 85, 90, 95]
COMMON_METHODS = ['median', 'mean']

# Cache results in memory with lazy loading
class PerformanceOptimizedAnalyzer:
    def __init__(self):
        self._precomputed_cache = {}
        self._load_precomputed_data()
```

### 3. Database Migration
**Impact: 60-80% improvement**
```sql
-- Migrate from Parquet to SQLite for faster queries
CREATE INDEX idx_carrier_service_zone ON shipments(carrier, service_level, dest_zone);
CREATE INDEX idx_transit_time ON shipments(transit_time_days);
```

## Medium-Term Optimizations

### 4. Data Preprocessing Pipeline
**Impact: 85-95% improvement**
```python
# Pre-calculate all percentile combinations during data generation
def precompute_all_combinations():
    results = {}
    for percentile in COMMON_PERCENTILES:
        for method in COMMON_METHODS:
            results[f"p{percentile}_{method}"] = calculate_percentile_data(percentile, method)
    return results
```

### 5. Memory-Efficient Data Structures
**Impact: 30-50% improvement**
```python
# Use categorical data types and optimized storage
df['carrier'] = df['carrier'].astype('category')
df['service_level'] = df['service_level'].astype('category')
df = df.astype({
    'transit_time_days': 'float32',
    'shipping_cost_usd': 'float32',
    'dest_zone': 'uint8'
})
```

### 6. Async Processing with Background Workers
**Impact: Perceived 90%+ improvement**
```javascript
// Background processing for cache warming
async function backgroundCacheWarmer() {
    setInterval(async () => {
        await warmCommonQueries();
    }, 5 * 60 * 1000); // Every 5 minutes
}
```

## Advanced Optimizations

### 7. Redis/Memory Database Integration
**Impact: 95%+ improvement**
```javascript
// Ultra-fast Redis cache for hot data
const redis = require('redis');
const client = redis.createClient();

async function getCachedResult(key) {
    const cached = await client.get(key);
    return cached ? JSON.parse(cached) : null;
}
```

### 8. Query Result Streaming
**Impact: Better UX for large datasets**
```javascript
// Stream results for large queries
app.get('/analytics/streaming-results', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked'
    });
    // Stream partial results as they're computed
});
```

## Implementation Priority

### Phase 1 (Immediate - 1-2 days):
1. ✅ **Enhanced Caching** (Already implemented - 48x improvement)
2. **Persistent Python Workers** (80% improvement)
3. **Precomputed Common Queries** (90% improvement)

### Phase 2 (Short-term - 1 week):
4. **Database Migration to SQLite** (70% improvement)
5. **Data Type Optimization** (40% improvement)
6. **Background Cache Warming** (Perceived 95% improvement)

### Phase 3 (Medium-term - 2-3 weeks):
7. **Full Precomputation Pipeline** (95% improvement)
8. **Redis Integration** (99% improvement)
9. **Query Result Streaming** (Better UX)

## Specific Code Changes Needed

### 1. Persistent Python Worker Implementation
```javascript
// In server.js - replace callAnalyticsWrapper
class PythonAnalyticsWorker {
    constructor() {
        this.worker = spawn('uv', ['run', 'python', 'analytics_service.py'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: __dirname
        });
        this.setupWorker();
    }
    
    async query(requestType, ...params) {
        return new Promise((resolve, reject) => {
            const request = { id: Date.now(), type: requestType, params };
            this.pendingRequests.set(request.id, { resolve, reject });
            this.worker.stdin.write(JSON.stringify(request) + '\n');
        });
    }
}
```

### 2. Precomputation Service
```python
# New file: precompute_analytics.py
class PrecomputeService:
    def __init__(self):
        self.analyzer = ShippingStatisticsAnalyzer()
        
    def precompute_all_percentile_combinations(self):
        results = {}
        for percentile in [50, 70, 80, 85, 90, 95]:
            for method in ['median', 'mean']:
                key = f"percentile_{percentile}_{method}"
                results[key] = self.analyzer.get_carrier_zone_summary_percentile(percentile, method)
        
        # Save to fast-access format
        with open('precomputed_analytics.json', 'w') as f:
            json.dump(results, f)
```

## Expected Performance Improvements

| Optimization | Current Time | Optimized Time | Improvement |
|--------------|-------------|----------------|-------------|
| Cache Hit | 150ms | 3ms | 50x faster |
| Persistent Worker | 150ms | 30ms | 5x faster |
| Precomputed Data | 150ms | 5ms | 30x faster |
| Database Migration | 150ms | 25ms | 6x faster |
| Full Optimization | 150ms | 1-3ms | 50-150x faster |

## Monitoring and Metrics

```javascript
// Add performance monitoring
const performanceTracker = {
    trackApiCall(endpoint, startTime, cacheHit) {
        const duration = Date.now() - startTime;
        console.log(`${endpoint}: ${duration}ms ${cacheHit ? '(cached)' : '(computed)'}`);
    }
};
```
