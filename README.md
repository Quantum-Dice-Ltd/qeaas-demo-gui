# QEAAS Demo GUI

A web-based application for visualizing Quantum Random Number Generator (QRNG) data in real-time, specifically designed for the QEAAS (Quantum Entropy as a Service) platform.

## Features

- Real-time visualization of QRNG data, raw bits, and entropy
- Smooth, curved line charts without grid lines for clean visualization
- Automatic pause when switching tabs
- Configurable update interval and data points limit
- Important information display with server details
- Error handling and status updates
- Certificate-based authentication

## Configuration

The application can be configured through the `CONFIG` object in `script.js`:

```javascript
const CONFIG = {
    serverAddress: '127.0.0.1:8003',  // Server address
    endpointPath: '/randcertified?bytes=8',  // API endpoint path
    maxDataPoints: 200,  // Maximum number of data points to display
    updateInterval: 100,  // Update interval in milliseconds
    // ... other configuration options
};
```

## Setup

1. Clone the repository
2. Open `index.html` in a web browser
3. Configure the server address and endpoint path in `script.js` if needed

## Certificate Setup

To use the application, you need to import a valid certificate:

### Chrome (Windows)
1. Open Chrome Settings
2. Search for "certificate"
3. Click on "Manage certificates"
4. Select "Import" in the Certificate Import Wizard
5. Change file type to "Personal Information Exchange (*.p12)"
6. Select your .p12 certificate file
7. Enter the certificate password if required

> **Note**: Certificate authentication may not work properly on macOS Chrome due to differences in certificate handling. It is recommended to use Safari or Firefox on macOS.

## Important Notes

- Data capture automatically pauses when switching to a different tab
- The chart displays the last 200 data points by default
- Connection requires a valid certificate
- Default update interval is 100ms
- Server address is configurable (default: 127.0.0.1:8003)

## Error Handling

The application provides clear error messages for:
- Connection failures
- Certificate issues
- Invalid responses
- Network problems

## Browser Compatibility

The application is compatible with modern browsers that support:
- ES6 JavaScript
- Chart.js
- Fetch API
- Certificate authentication

> **Note**: For best compatibility, use Windows Chrome. macOS Chrome users may experience certificate-related issues.
