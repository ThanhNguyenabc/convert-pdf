# Convert PDF

Node.js application for converting HTML to PDF using Puppeteer.

## Development

`http://localhost:3003`

**Build and run:**

```bash
docker-compose up -d --build
```

**Stop:**

```bash
docker-compose down
```

Default: `http://localhost:3003`

## Production

`http://localhost:3002`

**Build and run:**

```bash
docker-compose -f docker-compose.prod.yaml up -d --build
```

**Stop:**

```bash
docker-compose -f docker-compose.prod.yaml down
```
