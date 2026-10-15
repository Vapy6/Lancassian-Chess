LANCASSIAN CHESS + MYOSIA WORLDBUILDER — GITHUB PAGES DEPLOY

IMPORTANT: Upload/extract ALL files in this folder into the ROOT of the GitHub repository's published folder.
The root must contain index.html AND worldbuilder.html side by side, plus sw.js, manifest.json, icon-192.png and icon-512.png.
Do not upload only the ZIP file. GitHub Pages does not serve the contents of a ZIP as a website.

ENABLE GITHUB PAGES
1. Open the repository on GitHub.
2. Go to Settings > Pages.
3. Under Build and deployment, choose "Deploy from a branch".
4. Select branch "main" (or the branch you use) and folder "/ (root)" if these files are in the repository root.
5. Save and wait for the Pages deployment to finish. Check the deployment status under Actions or Settings > Pages.

OPEN THE SITE
- Main chess page: https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/
- Worldbuilder: https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/worldbuilder.html

Replace YOUR-USERNAME and YOUR-REPOSITORY with your actual GitHub username and repository name.
For a custom domain, the worldbuilder path is /worldbuilder.html.

COMMON 404 FIXES
- Confirm worldbuilder.html is committed to the SAME published folder as index.html.
- File name must be exactly worldbuilder.html (lowercase).
- For a project site, include the repository path before /worldbuilder.html. A URL like
  https://YOUR-USERNAME.github.io/worldbuilder.html is wrong for most project sites.
- If Pages publishes from /docs, put ALL site files in /docs and choose that folder in Pages settings.
- Do not open the repository's github.com/blob/... URL as the live site. Use the github.io Pages URL.
- After changing files, wait for the Pages deployment to complete, then hard-refresh the page.

The chess page links to ./worldbuilder.html and the worldbuilder links back to ./index.html, so both links work from a GitHub Pages project subpath.

FEATURES
- Chess engine, multiplayer room links, and spectator mode.
- Myosia Worldbuilder (worldbuilder.html).
- Table tools added in the enhanced version: lighting, local player identity, chat panel, local MP3 playback, and local character-sheet editor.
- Player numbers are local to each browser. Shared MP3 hosting and durable cross-device player/sheet storage need backend support.
