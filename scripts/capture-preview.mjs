/**
 * Generic Visual Asset & Animated GIF Capture Script
 * Automated by GitHub Actions runner using Playwright & FFmpeg.
 * Works with any web framework (Next.js, Vite, React, Vue, Svelte, Astro, HTML).
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { spawn, execSync } from "node:child_process";
import path from "node:path";

const OUTPUT_DIR = path.resolve(process.cwd(), "assets");
const TEMP_VIDEO_DIR = path.resolve(process.cwd(), ".temp-video");
const MAX_WAIT_MS = 60_000;

// Ensure output directories exist
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
if (!existsSync(TEMP_VIDEO_DIR)) mkdirSync(TEMP_VIDEO_DIR, { recursive: true });

/**
 * Detect available run script from package.json
 */
function detectServerScript() {
  const pkgPath = path.resolve(process.cwd(), "package.json");
  if (!existsSync(pkgPath)) return "npm start";

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    const scripts = pkg.scripts || {};
    if (scripts.dev) return "npm run dev";
    if (scripts.preview) return "npm run preview";
    if (scripts.start) return "npm start";
    if (scripts.build && scripts.serve) return "npm run serve";
  } catch {}

  return "npm run dev";
}

/**
 * Polls candidate ports until local server responds
 */
/**
 * Probes a specific URL using GET to determine if a server is listening
 */
async function probeUrl(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "text/html,*/*" },
    });
    clearTimeout(timer);
    if (res.ok || res.status < 500) {
      return true;
    }
  } catch {}
  return false;
}

/**
 * Polls candidate ports and hosts until local server responds
 */
async function waitForAnyServer(candidatePorts = [5173, 3000, 4173, 8080, 8000], timeoutMs = MAX_WAIT_MS, dynamicPortRef = { port: null }) {
  const start = Date.now();
  console.log("[Visual Capture] Probing for active local server...");

  const candidateHosts = ["localhost", "127.0.0.1"];

  while (Date.now() - start < timeoutMs) {
    const ports = dynamicPortRef.port && !candidatePorts.includes(dynamicPortRef.port)
      ? [dynamicPortRef.port, ...candidatePorts]
      : dynamicPortRef.port
      ? [dynamicPortRef.port, ...candidatePorts.filter((p) => p !== dynamicPortRef.port)]
      : candidatePorts;

    for (const port of ports) {
      for (const host of candidateHosts) {
        const url = `http://${host}:${port}/`;
        if (await probeUrl(url)) {
          console.log(`[Visual Capture] Discovered responsive server at ${url}`);
          return url;
        }
      }
    }
    await new Promise((r) => setTimeout(r, 800));
  }

  return null;
}

/**
 * Spawns the web project dev/start server if not already running
 */
async function ensureServerRunning() {
  const dynamicPortRef = { port: null };

  let activeUrl = await waitForAnyServer([5173, 3000, 4173, 8080, 8000], 3000, dynamicPortRef);
  if (activeUrl) return { url: activeUrl, process: null };

  const runCommand = detectServerScript();
  console.log(`[Visual Capture] Spawning server process with "${runCommand}"...`);

  const serverProcess = spawn(runCommand, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    detached: process.platform !== "win32",
    env: { ...process.env, PORT: "3000", HOST: "0.0.0.0" },
  });

  const onOutput = (data) => {
    const text = data.toString();
    process.stdout.write(text);
    const match = text.match(/https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]):(\d+)/i);
    if (match && match[1]) {
      const parsedPort = Number.parseInt(match[1], 10);
      if (!Number.isNaN(parsedPort)) {
        dynamicPortRef.port = parsedPort;
      }
    }
  };

  serverProcess.stdout.on("data", onOutput);
  serverProcess.stderr.on("data", onOutput);

  activeUrl = await waitForAnyServer([5173, 3000, 4173, 8080, 8000], MAX_WAIT_MS, dynamicPortRef);
  if (!activeUrl) {
    serverProcess.kill("SIGTERM");
    throw new Error("[Visual Capture] Web server failed to start within timeout.");
  }

  return { url: activeUrl, process: serverProcess };
}

/**
 * Smoothly scrolls down the entire page to trigger reveal animations and lazy loading
 */
async function smoothScrollPage(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 120;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 70);
    });
  });

  await page.waitForTimeout(600);

  // Return smoothly to top
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(800);
}

/**
 * Exports WebM video to an optimized animated GIF with two-pass palette generation
 */
function convertToOptimizedGif(inputVideoPath, outputGifPath) {
  console.log(`[Visual Capture] Converting ${inputVideoPath} to optimized GIF via FFmpeg...`);
  try {
    const filter = "fps=14,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:reserve_transparent=0[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3";
    execSync(`ffmpeg -y -i "${inputVideoPath}" -vf "${filter}" "${outputGifPath}"`, {
      stdio: "inherit",
    });
    console.log(`[Visual Capture] Successfully generated: ${outputGifPath}`);
  } catch (err) {
    console.warn("[Visual Capture] Standard FFmpeg palette failed, running fallback...", err.message);
    try {
      execSync(`ffmpeg -y -i "${inputVideoPath}" -vf "fps=12,scale=800:-1" "${outputGifPath}"`, {
        stdio: "inherit",
      });
      console.log(`[Visual Capture] Fallback GIF created: ${outputGifPath}`);
    } catch (e) {
      console.error("[Visual Capture] FFmpeg conversion failed:", e.message);
    }
  }
}

async function main() {
  console.log("[Visual Capture] Initializing remote Playwright asset runner...");

  const pw = await import("playwright");
  const chromium = pw.chromium;

  let server = null;

  try {
    server = await ensureServerRunning();
    const targetUrl = server.url;

    console.log(`[Visual Capture] Launching Chromium to capture: ${targetUrl}`);
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    // 1. Desktop Viewport with Video Recording
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      recordVideo: {
        dir: TEMP_VIDEO_DIR,
        size: { width: 1280, height: 800 },
      },
    });

    const page = await desktopContext.newPage();
    console.log(`[Visual Capture] Navigating to root (${targetUrl})...`);
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("load").catch(() => {});
    await page.waitForTimeout(2000);

    // Capture Hero / Above-the-fold
    console.log("[Visual Capture] Saving hero.png...");
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "hero.png"),
      fullPage: false,
    });

    // Scroll to trigger all CSS & JS animations
    console.log("[Visual Capture] Scrolling to trigger animations & lazy assets...");
    await smoothScrollPage(page);

    // Capture Full Page
    console.log("[Visual Capture] Saving fullpage.png...");
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "fullpage.png"),
      fullPage: true,
    });

    await page.close();
    await desktopContext.close();

    // 2. Mobile Viewport (iPhone 14)
    console.log("[Visual Capture] Capturing mobile.png...");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await mobilePage.waitForLoadState("load").catch(() => {});
    await mobilePage.waitForTimeout(1000);
    await mobilePage.screenshot({
      path: path.join(OUTPUT_DIR, "mobile.png"),
      fullPage: false,
    });

    await mobilePage.close();
    await mobileContext.close();
    await browser.close();

    // 3. Convert Video to Animated GIF
    const recordedVideos = existsSync(TEMP_VIDEO_DIR) ? readdirSync(TEMP_VIDEO_DIR) : [];
    const videoFile = recordedVideos.find((f) => f.endsWith(".webm") || f.endsWith(".mp4"));

    if (videoFile) {
      const inputVideo = path.join(TEMP_VIDEO_DIR, videoFile);
      const outputGif = path.join(OUTPUT_DIR, "preview.gif");
      convertToOptimizedGif(inputVideo, outputGif);
      try {
        unlinkSync(inputVideo);
      } catch {}
    }

    console.log("[Visual Capture] All visual assets successfully generated in ./assets/!");
  } catch (error) {
    console.error("[Visual Capture] Runner failed:", error);
    process.exit(1);
  } finally {
    if (server?.process) {
      console.log("[Visual Capture] Stopping background server process...");
      try {
        if (process.platform !== "win32" && server.process.pid) {
          process.kill(-server.process.pid, "SIGKILL");
        } else {
          server.process.kill("SIGKILL");
        }
      } catch {}
    }
    console.log("[Visual Capture] Execution completed successfully.");
    process.exit(0);
  }
}

main();
