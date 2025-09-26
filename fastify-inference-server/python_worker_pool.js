import { spawn } from 'child_process';
import path from 'path';

/**
 * Python Worker Pool for Analytics
 * Manages persistent Python processes to avoid startup overhead
 */
class PythonWorkerPool {
  constructor(options = {}) {
    this.poolSize = options.poolSize || 2;
    this.workers = [];
    this.availableWorkers = [];
    this.requestQueue = [];
    this.requestCounter = 0;
    this.stats = {
      totalRequests: 0,
      activeWorkers: 0,
      queuedRequests: 0
    };

    // Initialize worker pool
    this.initializePool();

    // Set up cleanup on process exit
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  async initializePool() {
    console.log(`Initializing Python worker pool with ${this.poolSize} workers...`);

    for (let i = 0; i < this.poolSize; i++) {
      try {
        const worker = await this.createWorker(i);
        this.workers.push(worker);
        this.availableWorkers.push(worker);
        console.log(`Worker ${i} initialized successfully`);
      } catch (error) {
        console.error(`Failed to initialize worker ${i}:`, error);
      }
    }

    console.log(`Python worker pool ready with ${this.availableWorkers.length} workers`);
  }

  async createWorker(workerId) {
    return new Promise((resolve, reject) => {
      const worker = {
        id: workerId,
        process: null,
        available: false,
        pendingRequests: new Map(),
        stats: {
          requestCount: 0,
          startTime: Date.now(),
          lastActivity: Date.now()
        }
      };

      // Spawn the persistent Python service
      const pythonProcess = spawn('uv', ['run', 'python', 'persistent_analytics_service.py'], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      worker.process = pythonProcess;

      // Handle stdout (responses)
      let buffer = '';
      pythonProcess.stdout.on('data', (data) => {
        buffer += data.toString();

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line);
              this.handleWorkerResponse(worker, response);
            } catch (error) {
              console.error(`Worker ${workerId} sent invalid JSON:`, error);
            }
          }
        }
      });

      // Handle stderr (logs)
      pythonProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (message.includes('Service ready')) {
          worker.available = true;
          this.stats.activeWorkers++;
          resolve(worker);
        } else {
          console.log(`Worker ${workerId}:`, message);
        }
      });

      // Handle process exit
      pythonProcess.on('close', (code) => {
        console.log(`Worker ${workerId} exited with code ${code}`);
        this.handleWorkerExit(worker);
      });

      pythonProcess.on('error', (error) => {
        console.error(`Worker ${workerId} error:`, error);
        reject(error);
      });

      // Timeout for initialization
      setTimeout(() => {
        if (!worker.available) {
          reject(new Error(`Worker ${workerId} initialization timeout`));
        }
      }, 10000);
    });
  }

  handleWorkerResponse(worker, response) {
    const requestId = response.request_id;
    const pendingRequest = worker.pendingRequests.get(requestId);

    if (pendingRequest) {
      worker.pendingRequests.delete(requestId);
      worker.stats.requestCount++;
      worker.stats.lastActivity = Date.now();

      // Make worker available again
      if (!this.availableWorkers.includes(worker)) {
        this.availableWorkers.push(worker);
      }

      // Process next queued request if any
      this.processQueue();

      // Resolve the pending promise
      if (response.success) {
        pendingRequest.resolve(response.data);
      } else {
        pendingRequest.reject(new Error(response.error));
      }
    }
  }

  handleWorkerExit(worker) {
    // Remove from available workers
    const availableIndex = this.availableWorkers.indexOf(worker);
    if (availableIndex !== -1) {
      this.availableWorkers.splice(availableIndex, 1);
    }

    // Reject all pending requests for this worker
    for (const [requestId, pendingRequest] of worker.pendingRequests) {
      pendingRequest.reject(new Error('Worker process exited'));
    }
    worker.pendingRequests.clear();

    this.stats.activeWorkers--;

    // Try to restart the worker
    this.restartWorker(worker);
  }

  async restartWorker(failedWorker) {
    console.log(`Restarting worker ${failedWorker.id}...`);
    try {
      const newWorker = await this.createWorker(failedWorker.id);

      // Replace in workers array
      const workerIndex = this.workers.indexOf(failedWorker);
      if (workerIndex !== -1) {
        this.workers[workerIndex] = newWorker;
      }

      console.log(`Worker ${failedWorker.id} restarted successfully`);
    } catch (error) {
      console.error(`Failed to restart worker ${failedWorker.id}:`, error);
    }
  }

  async executeRequest(requestType, ...params) {
    return new Promise((resolve, reject) => {
      const requestId = `req_${++this.requestCounter}_${Date.now()}`;
      const request = {
        requestType,
        params,
        requestId,
        resolve,
        reject,
        createdAt: Date.now()
      };

      this.stats.totalRequests++;

      // Try to get an available worker
      const worker = this.availableWorkers.shift();

      if (worker) {
        this.assignRequestToWorker(worker, request);
      } else {
        // Queue the request
        this.requestQueue.push(request);
        this.stats.queuedRequests++;

        // Set timeout for queued requests
        setTimeout(() => {
          if (this.requestQueue.includes(request)) {
            this.requestQueue.splice(this.requestQueue.indexOf(request), 1);
            this.stats.queuedRequests--;
            reject(new Error('Request timeout - no workers available'));
          }
        }, 30000); // 30 second timeout
      }
    });
  }

  assignRequestToWorker(worker, request) {
    const workerRequest = {
      id: request.requestId,
      type: request.requestType,
      params: request.params
    };

    // Store pending request
    worker.pendingRequests.set(request.requestId, {
      resolve: request.resolve,
      reject: request.reject,
      startTime: Date.now()
    });

    // Send request to worker
    try {
      worker.process.stdin.write(JSON.stringify(workerRequest) + '\n');
    } catch (error) {
      worker.pendingRequests.delete(request.requestId);
      request.reject(new Error(`Failed to send request to worker: ${error.message}`));

      // Make worker available again (it might still be working)
      if (!this.availableWorkers.includes(worker)) {
        this.availableWorkers.push(worker);
      }
    }
  }

  processQueue() {
    while (this.requestQueue.length > 0 && this.availableWorkers.length > 0) {
      const request = this.requestQueue.shift();
      const worker = this.availableWorkers.shift();

      this.stats.queuedRequests--;
      this.assignRequestToWorker(worker, request);
    }
  }

  getStats() {
    const workerStats = this.workers.map(worker => ({
      id: worker.id,
      available: this.availableWorkers.includes(worker),
      requestCount: worker.stats.requestCount,
      uptime: Date.now() - worker.stats.startTime,
      lastActivity: worker.stats.lastActivity
    }));

    return {
      pool: {
        totalWorkers: this.workers.length,
        availableWorkers: this.availableWorkers.length,
        queuedRequests: this.requestQueue.length,
        totalRequests: this.stats.totalRequests
      },
      workers: workerStats
    };
  }

  async shutdown() {
    console.log('Shutting down Python worker pool...');

    // Clear the request queue
    for (const request of this.requestQueue) {
      request.reject(new Error('Service shutting down'));
    }
    this.requestQueue = [];

    // Terminate all workers
    for (const worker of this.workers) {
      if (worker.process) {
        worker.process.kill('SIGTERM');

        // Force kill after timeout
        setTimeout(() => {
          if (!worker.process.killed) {
            worker.process.kill('SIGKILL');
          }
        }, 5000);
      }
    }

    console.log('Python worker pool shutdown complete');
  }
}

export { PythonWorkerPool };
