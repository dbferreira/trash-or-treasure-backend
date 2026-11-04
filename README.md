# Treasure or Trash

Treasure or Trash is an AI agent that looks at photos of a second-hand item and tells you what it is worth. Send it one or more pictures. It returns:

- what the item is
- its condition
- a resale price range in CAD
- how confident it is
- the sources behind the estimate

This repository holds the backend. It is built with [Mastra](https://mastra.ai) and Google Gemini. The web frontend is a separate app.

## How it works

```
images + optional note
        │
        ▼
┌───────────────────────┐      ┌──────────────────────────────┐
│ pricing-workflow      │ ───▶ │ Pricing Agent                │
│ (validates input with │      │ gemini-3-flash-preview       │
│  Zod)                 │ ◀─── │ multimodal input, structured │
└───────────────────────┘      │ output                       │
        │                      └──────────────────────────────┘
        ▼
{ item, price, confidence, sources }
```

- **[`src/mastra/agents/pricing-agent.ts`](src/mastra/agents/pricing-agent.ts)**: the agent and its prompt. The prompt covers how to identify the item, how to judge its condition, a confidence scale, and pricing rules for the local market. It treats several images as different angles of the same item.
- **[`src/mastra/workflows/pricing-workflow.ts`](src/mastra/workflows/pricing-workflow.ts)**: a one-step workflow. It checks the input, builds one multimodal message from the images and the note, and forces the model's answer into a typed schema with Zod.
- **[`src/mastra/index.ts`](src/mastra/index.ts)**: registers the agent and the workflow with Mastra, and sets up logging, storage and AI tracing.

## API

Start a run:

```http
POST /api/workflows/pricingWorkflow/start-async
Content-Type: application/json

{
  "inputData": {
    "images": [
      { "url": "data:image/jpeg;base64,...", "mimeType": "image/jpeg" }
    ],
    "description": "Bought in 2021, works fine"
  }
}
```

Send 1 to 10 images. Each `url` can be a base64 data URI or a public image URL. `description` is optional.

The result is in `steps["identify-and-price"].output`:

```json
{
  "item": {
    "name": "Herman Miller Aeron Chair, Size B",
    "description": "Graphite frame, light wear on the armrests, mesh intact"
  },
  "price": { "low": "450", "high": "650" },
  "confidence": 72,
  "sources": [
    { "url": "https://www.kijiji.ca/...", "type": "Kijiji" }
  ]
}
```

## Getting started

You need Node.js 22.13 or later and a [Google AI Studio](https://aistudio.google.com/) API key.

```bash
npm install
cp .env.example .env   # then set GOOGLE_GENERATIVE_AI_API_KEY
npm run dev            # Mastra dev server and playground on http://localhost:4111
```

The Mastra playground lets you run the workflow and see each agent call without a frontend.

To build an image payload by hand, run `node image-to-b64.js <path-to-image>`. It copies the image to your clipboard as a data URI. It works on macOS only, because it uses `pbcopy`.

| Script          | What it does                    |
| --------------- | ------------------------------- |
| `npm run dev`   | Starts the dev server with the playground |
| `npm run build` | Builds the production bundle into `.mastra/` |
| `npm run start` | Runs the production build       |

## Docker and deployment

```bash
docker build -t treasure-or-trash .
docker run -p 4111:4111 --env-file .env treasure-or-trash
```

`deploy.sh` copies the project to a remote Docker host over SSH and rebuilds it with `docker compose`. Set `DEPLOY_HOST`, and `DEPLOY_DIR` if needed, in your environment or in a `.env.deploy` file. `.env.example` lists the variables. The remote host must have a `docker-compose.yml` with a service of the same name.

## Known limitations

- **No live web search yet.** The prompt asks the model to check local listings, but the agent has no search tool. Prices and sources come from what the model already knows, so treat the sources as unverified. Adding a search tool or Gemini search grounding is the next step.
- **Tuned for Ottawa, Canada.** All prices are in CAD and use the local market. To change the region, edit the prompt.
- **No authentication.** Every request costs model credits, so do not expose the API to the internet unprotected.

## License

[MIT](LICENSE)
