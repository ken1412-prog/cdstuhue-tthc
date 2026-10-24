# Custom domain: cdstuhue.is-an.org (PENDING)

**Status:** application email sent by the project owner, approval/DNS not yet verified. This is a staging branch; do **not** merge before DNS exists and GitHub Pages custom-domain settings are ready.

## Request to is-an.org
- Subdomain: `cdstuhue.is-an.org`
- Project: CDSTUHUE, public informational website for Hue, Viet Nam; approved Q&A and aggregated administrative statistics. Independent, **not** an official government or Party portal.
- Website: https://ken1412-prog.github.io/cdstuhue-tthc/
- Code: https://github.com/ken1412-prog/cdstuhue-tthc
- DNS record: `CNAME cdstuhue.is-an.org -> ken1412-prog.github.io`

## After approval only
1. Verify the provider has published the CNAME and that `cdstuhue.is-an.org` resolves to `ken1412-prog.github.io`.
2. In repository Settings > Pages > Custom domain set `cdstuhue.is-an.org`; enable Enforce HTTPS after certificate readiness.
3. This project uses a GitHub Actions Pages deployment. For this mode GitHub Pages **ignores `site/CNAME`**, so the Pages Custom domain setting (step 2), DNS and HTTPS validation are authoritative. The staged CNAME is documentation only; merge after approval if desired.
4. Verify `https://cdstuhue.is-an.org/`, Q&A views, JSON feeds, assets and HTTPS. GitHub Pages will serve relative paths from domain root instead of `/cdstuhue-tthc/`.
5. Keep the old URL as fallback until tests pass.

Never expose credentials, bank details or individual records in DNS/domain registration.

## Source disclosure limitation
Browser View Source/DevTools cannot be disabled securely. A custom domain changes the address bar but does not hide DNS CNAME or a public GitHub repository. Keep copy/select/screenshot enabled. To stop public repository browsing, migrate the source to a private repository and use a host that supports private-repository deployments; public HTML/CSS/JS remains inspectable by users.
