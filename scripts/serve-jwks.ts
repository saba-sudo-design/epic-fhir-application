import fs from 'fs';
import http from 'http';
import path from 'path';

const port = Number(process.env.JWKS_PORT ?? 9999);
const jwksPath = path.join(process.cwd(), 'public', '.well-known', 'jwks.json');

if (!fs.existsSync(jwksPath)) {
  console.error('JWKS file not found. Run: npm run generate-jwks');
  process.exit(1);
}

const jwksBody = fs.readFileSync(jwksPath, 'utf8');

const server = http.createServer((req, res) => {
  if (req.url === '/.well-known/jwks.json' || req.url === '/jwks.json') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(jwksBody);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found. Use /.well-known/jwks.json');
});

server.listen(port, () => {
  console.log(`JWKS server running at http://localhost:${port}/.well-known/jwks.json`);
  console.log('');
  console.log('Expose it publicly with ngrok:');
  console.log(`  ngrok http ${port}`);
  console.log('');
  console.log('Then put this in Epic Non-Production JWK Set URL:');
  console.log('  https://<your-ngrok-subdomain>.ngrok-free.app/.well-known/jwks.json');
});
