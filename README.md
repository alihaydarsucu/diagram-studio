<p align="center">
  <img src="static/diagram-studio-icon.png" alt="Diagram Studio" width="128" />
</p>

# Diagram Studio

Diagram Studio is an open-source Mermaid diagram editor that you can download,
run, customize, and deploy wherever you prefer.

The project is designed for people who want their own private diagram editor,
without Mermaid Pro or premium-service promotions. You can deploy it on Fly.io,
Docker, a VPS, or another hosting provider, choose your own access password,
and create as many charts as your own infrastructure supports.

## Features

- Edit and preview flowcharts, sequence diagrams, gantt diagrams in real time.
- Save diagrams as PNG or SVG files
- Keep named projects in a deployment-backed dashboard
- Start with ten embedded-systems project examples for firmware design work
- Protect a deployment with a configurable password
- Get a link to a viewer of the diagram so that you can share it with others.
- Get a link to edit the diagram so that someone else can tweak it and send a new link back

## Screenshots

### Project dashboard

<p align="center">
  <img src="static/screenshots/dashboard.png" alt="Diagram Studio project dashboard" />
</p>

### Diagram editor

<p align="center">
  <img src="static/screenshots/editor.png" alt="Diagram Studio diagram editor" />
</p>

## Open-source self-hosting

You are free to download this repository, modify it, and deploy your own copy.
Each deployment can use its own domain, renderer settings, logo, theme, and
password. Authenticated project history and named diagrams are stored in the
deployment’s persistent data volume, not only in an individual browser.

### Password protection

The production image serves a custom login page and protects the workspace
with a signed, server-side session. Set the password as the
`DIAGRAM_STUDIO_PASSWORD` environment variable; do not commit the password to
the repository.

For a local Docker deployment:

```bash
docker build -t diagram-studio .
docker run --detach --name diagram-studio \
  --publish 8080:8080 \
  --volume diagram-studio-data:/data \
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

The server stores history in `/data/history.json`. Mount `/data` to a
persistent volume in production so projects survive restarts and redeploys.

## Docker

Build the image yourself so you control the password and deployment settings.

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

### Development

```bash
docker compose up --build
```

Then open http://localhost:3000

### Building and running images locally

#### Build

```bash
docker build -t diagram-studio .
```

#### Run

```bash
docker run --detach --name diagram-studio --publish 8080:8080 \
  --env DIAGRAM_STUDIO_AUTH_USER="Ali Haydar" \
  --env DIAGRAM_STUDIO_PASSWORD="choose-a-password" \
  diagram-studio
```

Visit: <http://localhost:8080>

#### Stop

```bash
docker stop diagram-studio
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

## Privacy and scope

This fork removes Mermaid Pro/Chart promotional UI and external Mermaid
branding from the editor. Project history is stored in the authenticated
deployment volume. Renderer and Kroki requests only occur when you explicitly
use those export links.
