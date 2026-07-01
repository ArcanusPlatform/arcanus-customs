/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Handle specific error types
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err 
    })
  });
}

/**
 * 404 handler
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`
  });
}
