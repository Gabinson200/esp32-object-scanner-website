# ESP32 Object Scanner Website

Public static website for creating a printable AprilTag board and installing matching ESP32 Object Scanner firmware directly over USB.

This is a standalone website repository. The scanner's C/C++ source, firmware patches, build environment, Git history, and private-repository links are excluded. Only the compiled firmware needed by the installer is distributed. Keep the original firmware repository private.

The website's HTML, CSS, JavaScript, board generator, and compiled firmware are public. A separate repository keeps the original firmware source private; it does not prevent copying or reverse-engineering the binary.

## Publish with GitHub Pages

1. Create a new **public** GitHub repository named **`esp32-object-scanner-website`**. Use hyphens in the repository name. Leave the new repository empty; do not initialize it with a README, license, or .gitignore, since these files are already provided here.
2. Extract this ZIP and open a terminal in the extracted `esp32-object-scanner-website` folder. Upload this folder's contents, including `.github/`, rather than the ZIP or an extra enclosing folder. Using Git:

   ```bash
   git init -b main
   git add .
   git commit -m "Add static scanner website"
   git remote add origin https://github.com/Gabinson200/esp32-object-scanner-website.git
   git push -u origin main
   ```

   Run these commands only in this newly extracted folder. Do not copy the old firmware repository or its `.git` directory into the public repository.

3. Open the new repository's **Settings → Pages**. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Open **Actions → Publish scanner website → Run workflow**, choose `main`, and run it. If the first push ran before Pages was enabled, rerun the failed workflow after completing step 3.
5. Wait for the deployment to succeed. GitHub reports the live URL in the workflow and Pages settings. With this repository name and account, the expected address is:

   **https://gabinson200.github.io/esp32-object-scanner-website/**

Future pushes changing `dist/`, `scripts/`, `package.json`, or the workflow publish automatically. The workflow validates the board generator and firmware image before uploading **only `dist/`**. It does not fetch or access the private firmware repository, and no personal access token is needed.

GitHub Pages is available for public repositories on GitHub Free. Supported paid plans also allow Pages from private repositories; a separate public website repository is useful when you want the firmware repository to remain private without relying on that option.

## Local preview

From this folder:

```bash
python -m http.server 8000 --directory dist
```

Open **http://localhost:8000/**. There are no packages to install and no website build step. For public hosting, use HTTPS. USB installation requires a desktop browser with Web Serial support, such as Chrome or Edge.

## Files

- `dist/index.html`, `style.css`, and `app.js`: the webpage and controls.
- `dist/board.js`, `viewer.js`, and `assets/`: AprilTag layouts, 3D preview, and printable downloads.
- `dist/firmware-config.js`: writes the selected tag IDs and dimensions into the compiled firmware's configuration partition.
- `dist/firmware/`: compiled firmware, installer manifest, checksum/compatibility metadata, dependency versions, and license notices.
- `scripts/check-board.mjs` and `scripts/check-firmware.mjs`: website checks; no firmware source or compiler is included.
- `.github/workflows/pages.yml`: GitHub Pages deployment.

The page has no links to the private scanner repository and no website-source download link. Third-party license notices and ESP Web Tools attribution remain available.

## Board and firmware behavior

The generator supports flat color inlay boards with four AprilTag 16h5 markers. Default TL/TR/BL/BR IDs are **0/1/3/2**; defaults are an 80 mm board, 20 mm tags, and a 3.1 mm outer margin. The controls validate unique IDs, spacing, dimensions, and printable thicknesses.

The browser generates a board configuration for the selected dimensions and IDs and combines it with the bundled firmware. It does not compile C++ or contact a private repository. Printing/exporting and firmware preparation happen in the browser.

The raw `scanner-merged.bin` is a template, not a ready-configured standalone download. Use the page's install button or configured firmware download. Installation clears saved scans and calibration; calibrate again afterward.

## Firmware updates

Build future firmware versions in the private scanner repository, preserving the board-configuration interface expected by this website. Then copy the release binary and its matching `manifest.json` and `build.json` into `dist/firmware/`. Update the checksum and version together and retain applicable dependency/license notices. Run the checks before pushing. Do not copy source files, patches, ELF files, maps, debug symbols, secrets, or the private repository's history.

With Node.js 22 or later, run the included checks using:

```bash
npm run check
```

These checks cover board export geometry and validation, firmware checksum and partitions, and the selected-board image format. They do not replace a physical USB installation and scanner test.

## External dependencies and licenses

Three.js and marker grids are bundled. ESP Web Tools loads from its pinned unpkg URL; Google Fonts has system-font fallbacks. License notices are retained in `dist/THIRD_PARTY_NOTICES.txt` and the firmware notice files. This package does not grant a new open-source license for your original firmware or website code.
"# esp32-object-scanner-website" 
