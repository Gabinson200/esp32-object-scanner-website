<p align="center">
  <a href="https://gabinson200.github.io/esp32-object-scanner-website/">
    <img src="dist/assets/icon.svg" width="88" height="88" alt="ESP32 Object Scanner">
  </a>
</p>

<h1 align="center">ESP32 Object Scanner</h1>

<p align="center">
  Create a printable AprilTag board and install matching scanner firmware directly from your browser.
</p>

<p align="center">
  <a href="https://gabinson200.github.io/esp32-object-scanner-website/"><strong>Open the website →</strong></a>
  &nbsp;·&nbsp;
  <a href="https://gabinson200.github.io/esp32-object-scanner-website/#board">Board generator</a>
  &nbsp;·&nbsp;
  <a href="https://gabinson200.github.io/esp32-object-scanner-website/#install">Install firmware</a>
</p>

---

## What is it?

ESP32 Object Scanner brings board creation and scanner setup into one webpage.

Design a custom AprilTag board, preview it in 3D, download the print files, and install firmware configured for your selected tag IDs and dimensions—without opening an IDE.

The scanner runs on a **Seeed XIAO ESP32-S3 Sense** with the **Seeed Round Display for XIAO**. Once configured, it captures views of a small object and reconstructs a colored 3D mesh on the device.

## What you can do

| Feature | Description |
| --- | --- |
| **Customize your board** | Choose four AprilTag 16h5 IDs and adjust board size, tag size, margins, and print thickness. |
| **Preview before printing** | Inspect the board in an interactive 3D view or switch to a top view. |
| **Download print files** | Export a 3MF, aligned white and black STLs, printable SVG, and board settings. |
| **Install over USB** | Flash the scanner from a supported desktop browser using ESP Web Tools. |
| **Keep settings matched** | Your selected tag IDs and dimensions are automatically included in the installation image. |

Board generation and firmware preparation happen in your browser. No file upload is required.

## From board to scan

### 1. Create your board

Open the [board generator](https://gabinson200.github.io/esp32-object-scanner-website/#board), select four different tag IDs, and adjust the dimensions.

The generator checks spacing and size limits as you edit. Use the 3D preview to inspect the result.

### 2. Print it

Download the print bundle and import the 3MF into your slicer as one multipart object. Assign **white** to the base and **black** to the marker parts.

For STL files, import both parts together and preserve their alignment. Print at **100% scale** so the physical dimensions match the scanner settings.

### 3. Install the firmware

Connect your scanner with a USB data cable, open the [installer](https://gabinson200.github.io/esp32-object-scanner-website/#install), and choose its serial port.

Use a desktop browser with Web Serial support, such as **Chrome or Edge**.

> Installation clears saved scans and calibration. Run CALIBRATE afterward.

### 4. Calibrate and scan

On the round display:

1. Select **CALIBRATE** and capture the board from varied angles and distances.
2. Place a small colored or dark object in the center of the board.
3. Select **START SCAN** and follow the on-screen guidance.
4. Select **GEN MESH** to generate and inspect the result.

## Required hardware

- **Seeed XIAO ESP32-S3 Sense** with camera
- **Seeed Round Display for XIAO**
- **USB data cable**
- A printed AprilTag board
- A compatible desktop browser for installation

## Default board

| Setting | Default |
| --- | --- |
| Board size | 80 × 80 mm |
| Tag size | 20 mm |
| Outer margin | 3.1 mm |
| Tag family | AprilTag 16h5 |
| IDs: top left / top right / bottom left / bottom right | 0 / 1 / 3 / 2 |
| Print style | Flat color inlay |

You can change these settings on the website before downloading and installing.

## Scanning tips

- Start with a colored or dark object approximately **47 mm across or smaller**.
- Keep the board flat and the markers clearly visible.
- Hold still when the scanner reaches a guided capture position.
- White objects and hidden concavities are challenging for silhouette-based reconstruction.
- A larger board does not increase the scanner’s reconstruction volume.

## Credits

Created by **Adam Kocsis**.

Browser installation uses [ESP Web Tools](https://esphome.github.io/esp-web-tools/). The interactive preview uses Three.js.

See the [third-party notices](dist/THIRD_PARTY_NOTICES.txt) for acknowledgments and licenses.
