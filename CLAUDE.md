# claude-snake-web

## ⚠️ ALWAYS SHARE THE TEST LINK ⚠️

After pushing changes to `main`, ALWAYS give the user the GitHub Pages URL so
they can test:

**https://benjamon.github.io/claude-snake-web/**

The `deploy-gh-pages.yml` workflow auto-builds and publishes on every push to
`main` (takes ~1 minute). Don't forget to remind the user that the deploy may
take a moment.

## Branches

- `main` — auto-deploys to GitHub Pages (test URL above).
- `itch-live` — auto-deploys to itch.io via `deploy-itch.yml`. Only push here
  when the user explicitly says to promote to itch.
