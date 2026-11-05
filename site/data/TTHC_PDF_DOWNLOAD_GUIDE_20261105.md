# TTHC public PDF downloads — 05/11/2026

The four links on `cap-nhat-tthc-2026-11.html` download short PDF handouts
generated during the GitHub Pages build from the already published public
procedure text. They do **not** serve or reproduce original training PDFs,
raw annotated slides, Zalo screenshots, personal records or private URLs.

Build: `python -m pip install reportlab beautifulsoup4`
then `python scripts/build_tthc_public_pdfs.py`.
Files are built to `site/downloads/tthc-20261105-{slug}.pdf` and included
automatically in the GitHub Pages upload artifact.

The current underlying approved 245 QA in `site/data/approved.json` are not
modified. Any download note on the site must state *bản tóm tắt* clearly.
