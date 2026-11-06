# Deployment

[Live demo](https://market-scout-roan.vercel.app/) · [Source repository](https://github.com/drat-git/market-scout)

Market Scout is hosted on Vercel as a static React/Vite application. The existing `market-scout` project in the `dratgit` workspace is connected to this repository. Pushes to `main` deploy to production; Vercel provides preview deployments for other branches and pull requests.

## Build settings

The repository's `vercel.json` defines the build:

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Node.js | 22.x |
| Install command | `npm ci` |
| Build command | `npm test && npm run package:skills && npm run build` |
| Output directory | `dist` |
| Production branch | `main` |

Every deployment runs the tests, rebuilds the skills ZIP with Python 3, checks TypeScript, and compiles the dashboard. A failing test or build prevents that deployment from replacing the current site. No application environment variables, API keys, or database are required.

## Updating the site

1. Make changes locally and run the same checks used by Vercel:

   ```sh
   npm test
   npm run package:skills
   npm run build
   ```

2. Commit the changes, including the regenerated `public/market-scout-skills.zip` if its contents changed, and push to `main`.
3. Wait for the deployment to reach **Ready** in the Vercel dashboard.
4. Check the public URL and the skills download.

The production aliases are [market-scout-roan.vercel.app](https://market-scout-roan.vercel.app/) and [market-scout-dratgit.vercel.app](https://market-scout-dratgit.vercel.app/). For a rollback, promote a previous working production deployment in the Vercel dashboard.

## Hosting boundaries

Vercel serves the compiled dashboard and public downloads. Skills run in a local checkout; their saved research artifacts do not automatically update the dashboard. The experimental backend in `server/` is not part of the production app.

The first release on November 6, 2026 used a manually uploaded static build. The Git-connected workflow retains that project's production URLs.
