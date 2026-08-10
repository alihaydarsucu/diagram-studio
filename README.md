[![Join our Discord!](https://img.shields.io/static/v1?message=join%20chat&color=9cf&logo=discord&label=discord)](https://discord.gg/sKeNQX4Wtj)
[![Netlify Status](https://api.netlify.com/api/v1/badges/27fa023d-7c73-4a3f-9791-b3b657a47100/deploy-status)](https://app.netlify.com/sites/mermaidjs/deploys)

# Diagram Studio

Diagram Studio is an open-source Mermaid diagram editor that you can download,
run, customize, and deploy wherever you prefer.

The project is designed for people who want their own private diagram editor:
you can deploy it on Fly.io, Docker, a VPS, or another hosting provider and
choose your own access password.

## Features

- Edit and preview flowcharts, sequence diagrams, gantt diagrams in real time.
- Save diagrams as PNG or SVG files
- Keep named projects in a local dashboard
- Protect a deployment with a configurable password
- Get a link to a viewer of the diagram so that you can share it with others.
- Get a link to edit the diagram so that someone else can tweak it and send a new link back

## Live demo

You can try out the [Diagram Studio live version](https://diagram-studio.fly.dev/).

## Open-source self-hosting

You are free to download this repository, modify it, and deploy your own copy.
Each deployment can use its own domain, renderer settings, logo, theme, and
password. Diagram data is kept in the browser unless you configure an external
service yourself.

### Password protection

The production image uses nginx Basic Auth. Set the password as the
`DIAGRAM_STUDIO_PASSWORD` environment variable; do not commit the password to
the repository.

For a local Docker deployment:

```bash
docker build -t diagram-studio .
docker run --detach --name diagram-studio \
  --publish 8080:8080 \
  --env DIAGRAM_STUDIO_AUTH_USER="Ali Haydar" \
  --env DIAGRAM_STUDIO_PASSWORD="choose-a-password" \
  diagram-studio
```

For Fly.io, use a runtime secret:

```bash
fly secrets set DIAGRAM_STUDIO_PASSWORD="choose-a-password" --app your-app-name
fly deploy
```

The default login name is `Ali Haydar` and can be changed with
`DIAGRAM_STUDIO_AUTH_USER`.

# Contributors are welcome!

If you want to speed up the progress for mermaid-live-editor, join the Discord channel and contact knsv.

## Docker

### Run published image

```bash
docker run --platform linux/amd64 --publish 8000:8080 ghcr.io/mermaid-js/mermaid-live-editor
```

The published docker image is built using our default environment variables. You cannot override them when running the image. If you need to customize them, you will need to build the image yourself.

### To configure renderer URL

When building set the MERMAID_RENDERER_URL build argument to the rendering
service.
Example:
Default is`https://mermaid.ink`.
Set to empty string to disable PNG and SVG links under Actions

### To configure Kroki Instance URL

When building set the MERMAID_KROKI_RENDERER_URL build argument to your Kroki
instance.
Default is `https://kroki.io`
Set to empty string to disable Kroki link under Actions

### To configure Analytics

When building set the MERMAID_ANALYTICS_URL build argument to your plausible instance, and MERMAID_DOMAIN to your domain.

Default is empty, disabling analytics.

### To enable Mermaid Chart links and promotion

When building set the MERMAID_IS_ENABLED_MERMAID_CHART_LINKS build argument to `true`

Default is empty, disabling button to save to Mermaid Chart and promotional banner.

### To update the Security modal

The modal shown on clicking the security link assumes analytics, renderer, Kroki
and Mermaid chart are enabled. You can update it by modifying `Privacy.svelte`
if you wish.

### Development

```bash
docker compose up --build
```

Then open http://localhost:3000

### Building and running images locally

#### Build

```bash
docker build -t mermaid-js/mermaid-live-editor .
```

#### Run

```bash
docker run --detach --name mermaid-live-editor --publish 8080:8080 mermaid-js/mermaid-live-editor
```

Visit: <http://localhost:8080>

#### Stop

```bash
docker stop mermaid-live-editor
```

## Setup

Below link will help you making a copy of the repository in your local system.

https://docs.github.com/en/get-started/quickstart/fork-a-repo

## Requirements

- [Node.js](https://nodejs.org/en/) current LTS version
- [pnpm](https://pnpm.io/) package manager. Install with `corepack enable pnpm`

## Development

```sh
pnpm install
pnpm dev -- --open
```

This app is created with Svelte Kit.

## Release

When a PR is created targeting master, it will be built and deployed by Netlify.
The URL will be indicated in a Comment in the PR.

Once the PR is merged, it will automatically be released.
