# Cloudflare Pages Setup

Use GitHub auto-deploy for this project.

## Build settings

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: `22`

## Deploy flow

1. Push this project to GitHub.
2. In Cloudflare, open `Workers & Pages`.
3. Create a `Pages` project from your GitHub repository.
4. Select the production branch, usually `main`.
5. Add your subdomain in `Custom domains`.

After setup, every `git push` deploys automatically.

## Local command

`npm run deploy` now only builds the project locally.
