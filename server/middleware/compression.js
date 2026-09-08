const zlib = require('zlib');

/**
 * High-Performance Gzip Compressor for JSON Responses
 */
function sendJsonResponse(req, res, statusCode, data) {
  const payloadStr = JSON.stringify(data);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = statusCode;

  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (acceptEncoding.includes('gzip') && payloadStr.length > 1024) {
    try {
      const compressed = zlib.gzipSync(Buffer.from(payloadStr));
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.end(compressed);
      return;
    } catch (e) {
      // Fallback to uncompressed on error
    }
  }
  res.end(payloadStr);
}

module.exports = { sendJsonResponse };
