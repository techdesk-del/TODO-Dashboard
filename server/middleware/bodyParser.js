/**
 * Protected JSON Body Parser with 1MB Payload DOS Shield
 */
function parseBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let totalBytes = 0;

    req.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        req.destroy();
        const err = new Error('Payload exceeds limit');
        err.statusCode = 413;
        reject(err);
        return;
      }
      body += chunk;
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        resolve({});
      }
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = { parseBody };
