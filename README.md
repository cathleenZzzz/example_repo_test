# Pinch Star Demo for GitHub Pages

This is a small webcam demo that tracks one hand in the browser. When the user pinches their thumb and index finger together, a glowing star appears between the fingertips.

## Files

- `index.html` — page structure
- `style.css` — layout and styling
- `app.js` — hand tracking logic and star drawing

## How to publish on GitHub Pages

1. Create a new GitHub repository.
2. Upload `index.html`, `style.css`, and `app.js` to the repository root.
3. Commit the files.
4. In GitHub, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select the main branch and the `/ (root)` folder.
7. Save.
8. Wait for GitHub Pages to publish the site.

Your page will be served over HTTPS, which is required for webcam access.

## Notes

- The demo loads MediaPipe from jsDelivr and uses Google's hosted hand landmark model.
- If you want everything local later, you can download the model file and change `modelAssetPath` in `app.js` to a local file in your repo.
