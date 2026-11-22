# NeuroUnknown findings website

Self-contained static site (one `index.html`, inline CSS/JS, local assets). No build step, no
dependencies — it works opened directly in a browser or served by GitHub Pages.

## Publish on GitHub Pages
1. In the repo on GitHub: **Settings → Pages → Build and deployment → Source: "GitHub Actions"**.
2. Push to `main` (or this working branch). The workflow `.github/workflows/neurounknown-pages.yml`
   publishes this folder. The live URL appears in the workflow run and on the Pages settings page
   (typically `https://<org>.github.io/blueprint/`).

You can also trigger it manually from the **Actions** tab (**Run workflow**).

## Regenerate
The page is generated from the curated portfolio so it stays in step with the data:
```
cd NeuroUnknown
PYTHONPATH=src python3 -m neurounknown.build_website
```
This rewrites `website/index.html` from `novelty/portfolio_curation.json`. Figures and PDFs live in
`website/assets/` (copied from `figures/` and `reports/`).

Content is computational hypotheses only — no discovery claims.
