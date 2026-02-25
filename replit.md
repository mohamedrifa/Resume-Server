# Resume Backend

A Node.js backend server that generates PDFs from HTML using Puppeteer and Chrome.

## Architecture

- **Runtime**: Node.js 20 (ESM modules)
- **Framework**: Express 5
- **PDF engine**: Puppeteer 24 with Chrome headless

## Endpoints

- `POST /generate-pdf` — Accepts `{ html, fileName }` in JSON body, returns a PDF binary

## Setup Notes

- Chrome is installed to `/home/runner/.cache/puppeteer/` via `node node_modules/puppeteer/install.mjs`
- The `postinstall` script in `package.json` handles Chrome installation automatically
- Required system libraries (glib, nss, gtk3, mesa, etc.) are installed via Nix

## Port Configuration

- Server listens on port **3000** (localhost)
- Workflow is configured as a console app (no webview)

## Deployment

- Target: autoscale
- Run command: `node server.js`
