# Custom domain: cdstuhue.is-an.org (PENDING)

**Status:** application not yet submitted/approved. This is a staging branch; do **not** merge before DNS exists and GitHub Pages custom-domain settings are ready.

## Request to is-an.org
- Subdomain: `cdstuhue.is-an.org`
- Project: CDSTUHUE, public informational website for Hue, Viet Nam; approved Q&A and aggregated administrative statistics. Independent, **not** an official government or Party portal.
- Website: https://ken1412-prog.github.io/cdstuhue-tthc/
- Code: https://github.com/ken1412-prog/cdstuhue-tthc
- DNS record: `CNAME cdstuhue.is-an.org -> ken1412-prog.github.io`

## After approval only
1. Verify the provider has published the CNAME and that `cdstuhue.is-an.org` resolves to `ken1412-prog.github.io`.
2. In repository Settings > Pages > Custom domain set `cdstuhue.is-an.org`; enable Enforce HTTPS after certificate readiness.
3. Merge this staging branch, ensuring the deployed `site/CNAME` matches the verified domain.
4. Verify `https://cdstuhue.is-an.org/`, Q&A views, JSON feeds, assets and HTTPS. GitHub Pages will serve relative paths from domain root instead of `/cdstuhue-tthc/`.
5. Keep the old URL as fallback until tests pass.

Never expose credentials, bank details or individual records in DNS/domain registration.
