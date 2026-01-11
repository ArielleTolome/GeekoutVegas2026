const { chromium } = require('playwright');
const { parse } = require('node-html-parser');
const path = require('path');
const fs = require('fs').promises;
const {
  normalizeUrl,
  generateOutputFolder,
  getAssetType,
  getExtension,
  isDataUrl,
  resolveUrl,
  parseSrcset,
  extractCssUrls,
  generateAssetFilename,
} = require('./utils');

/**
 * Main cloner class that handles the website cloning pipeline
 */
class WebsiteCloner {
  constructor(options = {}) {
    this.headless = options.headless !== false;
    this.outputDir = options.outputDir || path.join(process.cwd(), 'output');
    this.emitter = options.emitter || null;
    this.browser = null;
    this.page = null;
    this.baseUrl = '';
    this.finalUrl = '';
    this.assetMap = new Map(); // Maps original URL -> local path
    this.downloadedAssets = new Set();
    this.cssUrls = new Map(); // CSS URL -> content for reprocessing
  }

  /**
   * Emit a log message to the UI
   */
  log(type, message, data = {}) {
    const logEntry = {
      type,
      message,
      timestamp: new Date().toISOString(),
      ...data,
    };

    if (this.emitter) {
      this.emitter(logEntry);
    }

    console.log(`[${type}] ${message}`);
  }

  /**
   * Main clone function
   */
  async clone(url) {
    let folderName;

    try {
      // Step 1: Validate and normalize URL
      this.log('pipeline', 'Validating URL...');
      this.baseUrl = normalizeUrl(url);
      this.log('pipeline', `Normalized URL: ${this.baseUrl}`);

      // Generate output folder
      folderName = generateOutputFolder(this.baseUrl);
      const outputPath = path.join(this.outputDir, folderName);

      // Create output directories
      await fs.mkdir(outputPath, { recursive: true });
      await fs.mkdir(path.join(outputPath, 'assets', 'images'), { recursive: true });
      await fs.mkdir(path.join(outputPath, 'assets', 'css'), { recursive: true });
      await fs.mkdir(path.join(outputPath, 'assets', 'js'), { recursive: true });
      await fs.mkdir(path.join(outputPath, 'assets', 'fonts'), { recursive: true });
      await fs.mkdir(path.join(outputPath, 'assets', 'other'), { recursive: true });

      // Step 2: Launch browser
      this.log('pipeline', 'Launching browser...');
      this.browser = await chromium.launch({
        headless: this.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
        ],
      });

      const context = await this.browser.newContext({
        viewport: { width: 1366, height: 768 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      this.page = await context.newPage();
      this.log('pipeline', 'Browser launched successfully');

      // Step 3: Attach event listeners
      this.attachListeners();

      // Step 4: Navigate to page
      this.log('pipeline', 'Navigating to page...');
      const response = await this.page.goto(this.baseUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });

      this.finalUrl = this.page.url();
      this.log('pipeline', `Page loaded (Status: ${response?.status() || 'unknown'})`);

      // Wait for initial hydration
      await this.page.waitForTimeout(2000);

      // Step 5: Auto-scroll to trigger lazy loading
      this.log('pipeline', 'Auto-scrolling to load lazy content...');
      await this.autoScroll();

      // Wait for network idle
      this.log('pipeline', 'Waiting for network idle...');
      try {
        await this.page.waitForLoadState('networkidle', { timeout: 10000 });
      } catch (e) {
        this.log('pipeline', 'Network idle timeout - continuing anyway');
      }

      // Step 6: Extract rendered HTML
      this.log('pipeline', 'Extracting rendered HTML...');
      let html = await this.page.content();
      this.log('pipeline', `HTML extracted (${html.length} bytes)`);

      // Step 7: Parse and collect assets
      this.log('pipeline', 'Parsing HTML and collecting assets...');
      const root = parse(html);
      const assets = this.collectAssets(root);
      this.log('pipeline', `Found ${assets.length} assets to download`);

      // Step 8: Download assets
      this.log('pipeline', 'Downloading assets...');
      await this.downloadAssets(assets, outputPath, context);

      // Step 9: Process CSS files for additional assets
      this.log('pipeline', 'Processing CSS for additional assets...');
      await this.processCssAssets(outputPath, context);

      // Step 10: Rewrite HTML references
      this.log('pipeline', 'Rewriting HTML references...');
      html = await this.page.content(); // Get fresh HTML
      html = this.rewriteHtml(html);

      // Step 11: Save output
      this.log('pipeline', 'Saving output...');
      const indexPath = path.join(outputPath, 'index.html');
      await fs.writeFile(indexPath, html, 'utf8');

      this.log('pipeline', 'Clone completed successfully!');

      return {
        success: true,
        outputPath: folderName,
        openUrl: `/clone/${folderName}/index.html`,
        assetsDownloaded: this.downloadedAssets.size,
      };
    } catch (error) {
      this.log('error', `Clone failed: ${error.message}`);
      throw error;
    } finally {
      // Cleanup
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  /**
   * Attach console and network listeners
   */
  attachListeners() {
    // Console logs
    this.page.on('console', msg => {
      this.log('console', `[${msg.type()}] ${msg.text()}`);
    });

    // Page errors
    this.page.on('pageerror', error => {
      this.log('console', `[error] ${error.message}`);
    });

    // Network requests
    this.page.on('request', request => {
      this.log('network', `>> ${request.method()} ${request.url().substring(0, 100)}`, {
        method: request.method(),
        url: request.url(),
        resourceType: request.resourceType(),
      });
    });

    // Network responses
    this.page.on('response', response => {
      this.log('network', `<< ${response.status()} ${response.url().substring(0, 100)}`, {
        status: response.status(),
        url: response.url(),
      });
    });
  }

  /**
   * Auto-scroll to trigger lazy loading
   */
  async autoScroll() {
    const maxIterations = 20;
    const scrollDelay = 500;
    let lastHeight = 0;
    let sameHeightCount = 0;

    for (let i = 0; i < maxIterations; i++) {
      const currentHeight = await this.page.evaluate(() => document.body.scrollHeight);

      if (currentHeight === lastHeight) {
        sameHeightCount++;
        if (sameHeightCount >= 3) {
          this.log('pipeline', `Scroll complete (height stabilized at ${currentHeight}px)`);
          break;
        }
      } else {
        sameHeightCount = 0;
      }

      lastHeight = currentHeight;

      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      await this.page.waitForTimeout(scrollDelay);
      this.log('pipeline', `Scrolled... (height: ${currentHeight}px, iteration ${i + 1})`);
    }

    // Scroll back to top
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }

  /**
   * Collect all asset URLs from parsed HTML
   */
  collectAssets(root) {
    const assets = [];
    const seenUrls = new Set();

    const addAsset = (url, type) => {
      if (!url || isDataUrl(url) || seenUrls.has(url)) return;

      const resolvedUrl = resolveUrl(this.finalUrl, url);
      if (resolvedUrl && !isDataUrl(resolvedUrl) && !seenUrls.has(resolvedUrl)) {
        seenUrls.add(resolvedUrl);
        assets.push({ url: resolvedUrl, type, originalUrl: url });
      }
    };

    // Images
    root.querySelectorAll('img[src]').forEach(el => {
      addAsset(el.getAttribute('src'), 'images');
    });

    // Srcset images
    root.querySelectorAll('[srcset]').forEach(el => {
      const srcset = el.getAttribute('srcset');
      parseSrcset(srcset).forEach(url => addAsset(url, 'images'));
    });

    // CSS stylesheets
    root.querySelectorAll('link[rel="stylesheet"][href]').forEach(el => {
      addAsset(el.getAttribute('href'), 'css');
    });

    // Preload stylesheets
    root.querySelectorAll('link[rel="preload"][as="style"][href]').forEach(el => {
      addAsset(el.getAttribute('href'), 'css');
    });

    // Scripts
    root.querySelectorAll('script[src]').forEach(el => {
      addAsset(el.getAttribute('src'), 'js');
    });

    // Video sources
    root.querySelectorAll('video[src], video source[src]').forEach(el => {
      addAsset(el.getAttribute('src'), 'video');
    });

    // Audio sources
    root.querySelectorAll('audio[src], audio source[src]').forEach(el => {
      addAsset(el.getAttribute('src'), 'audio');
    });

    // Favicon and icons
    root.querySelectorAll('link[rel="icon"][href], link[rel="shortcut icon"][href], link[rel="apple-touch-icon"][href]').forEach(el => {
      addAsset(el.getAttribute('href'), 'images');
    });

    // Background images in style attributes
    root.querySelectorAll('[style*="url"]').forEach(el => {
      const style = el.getAttribute('style');
      extractCssUrls(style).forEach(url => addAsset(url, 'images'));
    });

    // Inline styles
    root.querySelectorAll('style').forEach(el => {
      const cssContent = el.innerHTML;
      extractCssUrls(cssContent).forEach(url => addAsset(url, 'images'));
    });

    // Preload fonts
    root.querySelectorAll('link[rel="preload"][as="font"][href]').forEach(el => {
      addAsset(el.getAttribute('href'), 'fonts');
    });

    // Open Graph and meta images
    root.querySelectorAll('meta[property="og:image"][content], meta[name="twitter:image"][content]').forEach(el => {
      addAsset(el.getAttribute('content'), 'images');
    });

    return assets;
  }

  /**
   * Download all assets
   */
  async downloadAssets(assets, outputPath, context) {
    const batchSize = 10;

    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      await Promise.all(
        batch.map(asset => this.downloadAsset(asset, outputPath, context))
      );
      this.log('pipeline', `Downloaded ${Math.min(i + batchSize, assets.length)}/${assets.length} assets`);
    }
  }

  /**
   * Download a single asset
   */
  async downloadAsset(asset, outputPath, context) {
    try {
      const response = await context.request.get(asset.url, {
        timeout: 30000,
        headers: {
          'Referer': this.finalUrl,
        },
      });

      if (!response.ok()) {
        this.log('warning', `Failed to download: ${asset.url} (${response.status()})`);
        return;
      }

      const contentType = response.headers()['content-type'] || '';
      const assetType = getAssetType(asset.url, contentType);
      const filename = generateAssetFilename(asset.url, contentType);
      const localPath = path.join('assets', assetType, filename);
      const fullPath = path.join(outputPath, localPath);

      const buffer = await response.body();
      await fs.writeFile(fullPath, buffer);

      // Store CSS content for later processing
      if (assetType === 'css') {
        this.cssUrls.set(asset.url, {
          content: buffer.toString('utf8'),
          localPath,
        });
      }

      // Map original URL to local path
      this.assetMap.set(asset.url, localPath);
      this.assetMap.set(asset.originalUrl, localPath);
      this.downloadedAssets.add(asset.url);

      this.log('network', `Saved: ${filename} (${assetType})`);
    } catch (error) {
      this.log('warning', `Error downloading ${asset.url}: ${error.message}`);
    }
  }

  /**
   * Process downloaded CSS files for additional assets (fonts, images)
   */
  async processCssAssets(outputPath, context) {
    for (const [cssUrl, cssData] of this.cssUrls) {
      const urls = extractCssUrls(cssData.content);

      for (const url of urls) {
        if (this.downloadedAssets.has(url) || isDataUrl(url)) continue;

        const resolvedUrl = resolveUrl(cssUrl, url);
        if (!resolvedUrl || isDataUrl(resolvedUrl) || this.downloadedAssets.has(resolvedUrl)) continue;

        try {
          const response = await context.request.get(resolvedUrl, {
            timeout: 30000,
            headers: { 'Referer': this.finalUrl },
          });

          if (response.ok()) {
            const contentType = response.headers()['content-type'] || '';
            const assetType = getAssetType(resolvedUrl, contentType);
            const filename = generateAssetFilename(resolvedUrl, contentType);
            const localPath = path.join('assets', assetType, filename);
            const fullPath = path.join(outputPath, localPath);

            const buffer = await response.body();
            await fs.writeFile(fullPath, buffer);

            this.assetMap.set(resolvedUrl, localPath);
            this.assetMap.set(url, localPath);
            this.downloadedAssets.add(resolvedUrl);

            this.log('network', `Saved (from CSS): ${filename}`);
          }
        } catch (e) {
          this.log('warning', `CSS asset error: ${url}`);
        }
      }

      // Rewrite CSS file with local paths
      let updatedCss = cssData.content;
      for (const [originalUrl, localPath] of this.assetMap) {
        // Create relative path from CSS file to asset
        const relativePath = path.relative(path.dirname(cssData.localPath), localPath).replace(/\\/g, '/');
        updatedCss = updatedCss.split(originalUrl).join(relativePath);
      }

      const cssFullPath = path.join(outputPath, cssData.localPath);
      await fs.writeFile(cssFullPath, updatedCss, 'utf8');
    }
  }

  /**
   * Rewrite HTML to use local asset paths
   */
  rewriteHtml(html) {
    let result = html;

    // Sort by URL length descending to avoid partial replacements
    const sortedEntries = [...this.assetMap.entries()].sort((a, b) => b[0].length - a[0].length);

    for (const [originalUrl, localPath] of sortedEntries) {
      // Escape special regex characters in URL
      const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Replace in src, href, content attributes
      result = result.replace(
        new RegExp(`(src|href|content)=["']${escapedUrl}["']`, 'gi'),
        `$1="${localPath}"`
      );

      // Replace in srcset
      result = result.replace(
        new RegExp(`${escapedUrl}(\\s+\\d+[wx])`, 'gi'),
        `${localPath}$1`
      );

      // Replace in url() CSS
      result = result.replace(
        new RegExp(`url\\s*\\(\\s*['"]?${escapedUrl}['"]?\\s*\\)`, 'gi'),
        `url("${localPath}")`
      );
    }

    // Remove any <base> tag that might interfere with relative paths
    result = result.replace(/<base[^>]*>/gi, '');

    return result;
  }
}

module.exports = { WebsiteCloner };
