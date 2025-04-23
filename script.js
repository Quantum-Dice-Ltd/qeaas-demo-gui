// Configuration
const CONFIG = {
    // serverAddress: 'testjson.qeaas.q-dice.com',
    serverAddress: '127.0.0.1:8003',
    endpointPath: '/randcertified?bytes=8',
    maxDataPoints: 200,
    updateInterval: 100, // milliseconds
    fetchOptions: {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        // Add these options to handle certificates
        cache: 'no-store',
        redirect: 'follow',
        // This helps with certificate selection
        referrerPolicy: 'no-referrer'
    },
    chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 0
            /*,
            onComplete: function(animation) {
                const chart = animation.chart;
                const ctx = chart.ctx;
                const datasets = chart.data.datasets;
                
                datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    if (!meta.hidden) {
                        meta.data.forEach((element, index) => {
                            // Draw the points
                            ctx.beginPath();
                            ctx.arc(element.x, element.y, 3, 0, 2 * Math.PI);
                            ctx.fillStyle = dataset.borderColor;
                            ctx.fill();
                        });
                    }
                });
            }*/
        },
        elements: {
            line: {
                tension: 0.4, // This makes the lines curved
                borderWidth: 2
            },
            point: {
                radius: 0,
                hoverRadius: 0
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
        scales: {
            x: {
                grid: {
                    display: false // Remove vertical grid lines
                }
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: 'QRNG Data (0-255)'
                },
                min: 0,
                max: 255,
                grid: {
                    display: false // Remove horizontal grid lines
                }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                    display: true,
                    text: 'Raw Bits'
                },
                grid: {
                    display: false // Remove horizontal grid lines
                },
                min: 0,
                max: 255
            },
            y2: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                    display: true,
                    text: 'Entropy'
                },
                grid: {
                    display: false // Remove horizontal grid lines
                },
                offset: true,
                min: 0,
                max: 255
            }
        }
    }
};

// Set the complete URL after CONFIG is initialized
CONFIG.endpoint = `https://${CONFIG.serverAddress}${CONFIG.endpointPath}`;

// Session tracking
const SESSION_STATS = {
    currentSession: {
        startTime: null,
        dataPoints: 0,
        totalBytes: 0
    },
    allTime: {
        dataPoints: 0,
        totalBytes: 0
    }
};

// Function to test connection and handle certificate selection
async function testConnection() {
    try {
        const response = await fetch(CONFIG.endpoint, CONFIG.fetchOptions);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // console.log('Connection test successful', data);
        return true;
    } catch (error) {
        console.error('Connection test failed:', error);
        const errorStatus = document.getElementById('errorStatus');
        errorStatus.textContent = `Connection Error: ${error.message}`;
        errorStatus.classList.add('show');
        
        if (error.message.includes('CERT_AUTHORITY_INVALID')) {
            errorStatus.textContent += ' - Please accept the security warning and select your certificate in the browser dialog that appears.';
        }
        return false;
    }
}

class RandomNumberVisualizer {
    constructor() {
        this.chart = null;
        this.dataPoints = [];
        this.entropySum = 0;
        this.rawBitsSum = 0;
        this.qrngSum = 0;
        this.count = 0;
        this.isCapturing = false;
        this.isTabVisible = true;
        this.initializeChart();
        this.setupVisibilityListener();
        this.loadSessionStats();
        this.updateInfoSection();
    }

    setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            this.isTabVisible = !document.hidden;
            if (!this.isTabVisible && this.isCapturing) {
                this.stopCapture();
                this.updateStatus('Capture paused - tab not visible');
            }
        });
    }

    loadSessionStats() {
        const savedStats = localStorage.getItem('randomVisualizerStats');
        if (savedStats) {
            SESSION_STATS.allTime = JSON.parse(savedStats);
        }
    }

    saveSessionStats() {
        localStorage.setItem('randomVisualizerStats', JSON.stringify(SESSION_STATS.allTime));
    }

    initializeChart() {
        const ctx = document.getElementById('randomChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'QRNG Data',
                        data: [],
                        borderColor: 'rgb(153, 102, 255)',
                        yAxisID: 'y',
                    },
                    {
                        label: 'Raw Bits',
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        yAxisID: 'y1',
                    },
                    {
                        label: 'Entropy',
                        data: [],
                        borderColor: 'rgb(255, 99, 132)',
                        yAxisID: 'y2',
                    }
                ]
            },
            options: CONFIG.chartOptions
        });
    }

    setButtonState(state) {
        const button = document.getElementById('startButton');
        button.className = state;
        button.disabled = state === 'connecting';
        button.textContent = state === 'running' ? 'Stop Capture' : 
                           state === 'error' ? 'Retry' : 
                           state === 'connecting' ? 'Connecting...' : 'Start Capture';
    }

    async startCapture() {
        if (this.isCapturing) return;
        
        // Clear any previous error status
        const errorStatus = document.getElementById('errorStatus');
        errorStatus.classList.remove('show');
        
        // Set connecting state
        this.setButtonState('connecting');
        
        const isConnected = await testConnection();
        if (!isConnected) {
            this.setButtonState('error');
            return;
        }
        
        this.isCapturing = true;
        this.setButtonState('running');
        SESSION_STATS.currentSession.startTime = new Date();
        
        while (this.isCapturing && this.isTabVisible) {
            try {
                const response = await fetch(CONFIG.endpoint, CONFIG.fetchOptions);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                // console.log('Received data:', data);
                this.processData(data);
                this.updateStatus();
                
                await new Promise(resolve => setTimeout(resolve, CONFIG.updateInterval));
            } catch (error) {
                console.error('Error fetching data:', error);
                this.handleError(error);
                return;
            }
        }
    }

    handleError(error) {
        this.clearChart();
        this.setButtonState('error');
        const errorStatus = document.getElementById('errorStatus');
        errorStatus.textContent = `Error: ${error.message}`;
        errorStatus.classList.add('show');
        
        // Update status display with error state
        this.updateStatusDisplay({
            sessionDuration: '0s',
            currentDataPoints: '0',
            currentTotalBytes: '0',
            allTimeDataPoints: SESSION_STATS.allTime.dataPoints.toString(),
            allTimeTotalBytes: SESSION_STATS.allTime.totalBytes.toString(),
            avgEntropy: '0.00',
            avgRawBits: '0.00',
            avgQrng: '0.00',
            latestQrngData: 'N/A'
        });
    }

    clearChart() {
        this.dataPoints = [];
        this.entropySum = 0;
        this.rawBitsSum = 0;
        this.qrngSum = 0;
        this.count = 0;
        this.updateChart();
    }

    stopCapture() {
        this.isCapturing = false;
        this.setButtonState('stopped');
    }

    processData(data) {
        if (!Array.isArray(data)) {
            console.error('Expected array but got:', data);
            return;
        }

        data.forEach(item => {
            // Process each byte in the hex string
            const hexBytes = item.data.match(/.{2}/g) || []; // Split into pairs of hex characters
            const byteValues = hexBytes.map(byte => parseInt(byte, 16));
            const avgByteValue = byteValues.reduce((a, b) => a + b, 0) / byteValues.length;
            
            this.dataPoints.push({
                timestamp: new Date().toLocaleTimeString(),
                rawBits: item.rawbits,
                entropy: item.entropy,
                qrngValue: avgByteValue,
                data: item.data
            });

            this.entropySum += item.entropy;
            this.rawBitsSum += item.rawbits;
            this.qrngSum += avgByteValue;
            this.count++;

            // Update session stats
            SESSION_STATS.currentSession.dataPoints++;
            SESSION_STATS.currentSession.totalBytes += byteValues.length;
            SESSION_STATS.allTime.dataPoints++;
            SESSION_STATS.allTime.totalBytes += byteValues.length;

            if (this.dataPoints.length > CONFIG.maxDataPoints) {
                this.dataPoints.shift();
            }

            this.updateChart();
            this.saveSessionStats();
        });
    }

    updateChart() {
        this.chart.data.labels = this.dataPoints.map(d => d.timestamp);
        this.chart.data.datasets[0].data = this.dataPoints.map(d => d.qrngValue);
        this.chart.data.datasets[1].data = this.dataPoints.map(d => d.rawBits);
        this.chart.data.datasets[2].data = this.dataPoints.map(d => d.entropy);
        this.chart.update();
    }

    updateStatus() {
        const sessionDuration = SESSION_STATS.currentSession.startTime ? 
            Math.round((new Date() - SESSION_STATS.currentSession.startTime) / 1000) : 0;
        
        const avgEntropy = this.count > 0 ? (this.entropySum / this.count).toFixed(2) : '0.00';
        const avgRawBits = this.count > 0 ? (this.rawBitsSum / this.count).toFixed(2) : '0.00';
        const avgQrng = this.count > 0 ? (this.qrngSum / this.count).toFixed(2) : '0.00';
        
        this.updateStatusDisplay({
            sessionDuration: `${sessionDuration}s`,
            currentDataPoints: SESSION_STATS.currentSession.dataPoints.toString(),
            currentTotalBytes: SESSION_STATS.currentSession.totalBytes.toString(),
            allTimeDataPoints: SESSION_STATS.allTime.dataPoints.toString(),
            allTimeTotalBytes: SESSION_STATS.allTime.totalBytes.toString(),
            avgEntropy,
            avgRawBits,
            avgQrng,
            latestQrngData: this.dataPoints.length > 0 ? this.dataPoints[this.dataPoints.length - 1].data : 'N/A'
        });

        // Clear any error status when update is successful
        const errorStatus = document.getElementById('errorStatus');
        errorStatus.classList.remove('show');
    }

    updateInfoSection() {
        document.getElementById('maxDataPointsInfo').textContent = CONFIG.maxDataPoints;
        document.getElementById('updateIntervalInfo').textContent = CONFIG.updateInterval;
        document.getElementById('serverAddressInfo').textContent = CONFIG.serverAddress;
    }

    updateStatusDisplay(data) {
        document.getElementById('sessionDuration').textContent = data.sessionDuration;
        document.getElementById('currentDataPoints').textContent = data.currentDataPoints;
        document.getElementById('currentTotalBytes').textContent = data.currentTotalBytes;
        document.getElementById('allTimeDataPoints').textContent = data.allTimeDataPoints;
        document.getElementById('allTimeTotalBytes').textContent = data.allTimeTotalBytes;
        document.getElementById('avgEntropy').textContent = data.avgEntropy;
        document.getElementById('avgRawBits').textContent = data.avgRawBits;
        document.getElementById('avgQrng').textContent = data.avgQrng;
        document.getElementById('latestQrngData').textContent = data.latestQrngData;

        // Update info section values
        this.updateInfoSection();
    }
}

// Initialize the visualizer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const visualizer = new RandomNumberVisualizer();
    
    document.getElementById('startButton').addEventListener('click', () => {
        if (visualizer.isCapturing) {
            visualizer.stopCapture();
        } else {
            visualizer.startCapture();
        }
    });
}); 