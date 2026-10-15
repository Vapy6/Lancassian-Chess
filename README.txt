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


MYOSIA CLOUD FEATURES (SUPABASE)
1. In your Supabase project, open SQL Editor > New query. Open supabase-setup.sql from this package, paste all of it, and run it.
2. In Authentication > URL Configuration, add https://vapy6.github.io to the allowed redirect URLs (or the exact GitHub Pages URL for this repository). For email confirmation, use the link sent to each account.
3. Upload every file and folder in this package to the repository root. Include the assets/ folder; it contains the fillable D&D 5e PDF template.
4. Open worldbuilder.html > Table. Each person creates an account. The GM clicks Create campaign and shares the invite code. Players sign in and enter that code under Join campaign.
5. The GM uploads music and uses Play/Pause/Stop. Players use the same campaign to hear it; the volume slider is local to each browser. Each player creates and saves their own private sheet. The GM can see sheets belonging to members of that campaign.

SECURITY AND LIMITS
- The Supabase publishable key is included in the browser code by design. Database and Storage access is protected by the RLS policies in supabase-setup.sql; never add a service_role or secret key to this website.
- This package has not run the SQL against your project. The cloud features will not work until you run the setup SQL.
- The supplied PDF template is included. The field editor dynamically exposes its fillable PDF fields and exports a filled PDF. Image/button fields are not editable in this browser form.
- Shared audio uses a private Storage bucket and signed URLs. Browsers may require each player to click once before audio can start. Audio sync uses realtime broadcast timing and may vary slightly across networks.
- Campaign membership is currently one active campaign at a time in this panel. Share the code only with players you want in the campaign.
