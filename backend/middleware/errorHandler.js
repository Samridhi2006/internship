export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.originalUrl}`
  });
}

export function errorHandler(err, req, res, next) {
  console.error('Unhandled Server Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error.',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}
