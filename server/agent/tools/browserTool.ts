/**
 * Browser Tool - Web automation and scraping
 */

import { Tool, ToolMetadata } from "../toolRegistry";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

export class BrowserTool implements Tool {
  metadata: ToolMetadata = {
    name: "browser",
    description: "Navigate websites, scrape content, and interact with web pages",
    capabilities: ["web_navigation", "content_scraping", "page_analysis"],
    maxRetries: 2,
    defaultTimeout: 15000, // 15 seconds
  };

  private userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

  /**
   * Execute browser operations
   */
  async execute(params: Record<string, unknown>): Promise<unknown> {
    const operation = params.operation as string;

    switch (operation) {
      case "fetch":
        return this.fetchPage(params.url as string, params.timeout as number);

      case "scrape":
        return this.scrapePage(
          params.url as string,
          params.selector as string,
          params.timeout as number
        );

      case "extract_text":
        return this.extractText(params.url as string, params.timeout as number);

      case "extract_links":
        return this.extractLinks(params.url as string, params.timeout as number);

      case "extract_metadata":
        return this.extractMetadata(params.url as string, params.timeout as number);

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Fetch a web page
   */
  private async fetchPage(url: string, timeout?: number): Promise<unknown> {
    this.validateUrl(url);

    try {
      const controller = new AbortController();
      const timeoutMs = timeout || this.metadata.defaultTimeout;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          headers: { "User-Agent": this.userAgent },
          signal: controller.signal,
        } as any);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        return {
          success: true,
          url,
          status: response.status,
          contentType: response.headers.get("content-type"),
          contentLength: html.length,
          html: html.substring(0, 50000), // Limit to 50KB
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      throw new Error(`Failed to fetch page: ${(error as Error).message}`);
    }
  }

  /**
   * Scrape elements matching selector
   */
  private async scrapePage(
    url: string,
    selector: string,
    timeout?: number
  ): Promise<unknown> {
    this.validateUrl(url);

    try {
      const controller = new AbortController();
      const timeoutMs = timeout || this.metadata.defaultTimeout;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          headers: { "User-Agent": this.userAgent },
          signal: controller.signal,
        } as any);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const dom = new JSDOM(html);
        const elements = dom.window.document.querySelectorAll(selector);

        const results = Array.from(elements).map((el: any) => ({
          text: el.textContent?.trim(),
          html: el.innerHTML,
          attributes: Array.from(el.attributes).reduce(
            (acc: Record<string, string>, attr: any) => {
              acc[attr.name] = attr.value;
              return acc;
            },
            {} as Record<string, string>
          ),
        }));

        return {
          success: true,
          url,
          selector,
          count: results.length,
          results: results.slice(0, 100), // Limit to 100 results
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      throw new Error(`Failed to scrape page: ${(error as Error).message}`);
    }
  }

  /**
   * Extract all text content from page
   */
  private async extractText(url: string, timeout?: number): Promise<unknown> {
    this.validateUrl(url);

    try {
      const controller = new AbortController();
      const timeoutMs = timeout || this.metadata.defaultTimeout;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          headers: { "User-Agent": this.userAgent },
          signal: controller.signal,
        } as any);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const dom = new JSDOM(html);

        // Remove script and style elements
        const scripts = dom.window.document.querySelectorAll("script, style");
        scripts.forEach((el: any) => el.remove());

        const text = dom.window.document.body.textContent
          ?.split("\n")
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0)
          .join("\n");

        return {
          success: true,
          url,
          textLength: text?.length || 0,
          text: text?.substring(0, 10000), // Limit to 10KB
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      throw new Error(`Failed to extract text: ${(error as Error).message}`);
    }
  }

  /**
   * Extract all links from page
   */
  private async extractLinks(url: string, timeout?: number): Promise<unknown> {
    this.validateUrl(url);

    try {
      const controller = new AbortController();
      const timeoutMs = timeout || this.metadata.defaultTimeout;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          headers: { "User-Agent": this.userAgent },
          signal: controller.signal,
        } as any);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const dom = new JSDOM(html, { url });
        const links = dom.window.document.querySelectorAll("a[href]");

        const results = Array.from(links)
          .map((link: any) => {
            const href = link.getAttribute("href");
            const text = link.textContent?.trim();
            try {
              const absoluteUrl = new URL(href || "", url).href;
              return {
                url: absoluteUrl,
                text: text || "",
              };
            } catch {
              return null;
            }
          })
          .filter((link: any) => link !== null);

        return {
          success: true,
          url,
          count: results.length,
          links: results.slice(0, 100), // Limit to 100 links
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      throw new Error(`Failed to extract links: ${(error as Error).message}`);
    }
  }

  /**
   * Extract page metadata
   */
  private async extractMetadata(url: string, timeout?: number): Promise<unknown> {
    this.validateUrl(url);

    try {
      const controller = new AbortController();
      const timeoutMs = timeout || this.metadata.defaultTimeout;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          headers: { "User-Agent": this.userAgent },
          signal: controller.signal,
        } as any);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const dom = new JSDOM(html);
        const doc = dom.window.document;

        const metadata = {
          title: doc.querySelector("title")?.textContent || "",
          description:
            doc.querySelector('meta[name="description"]')?.getAttribute("content") || "",
          keywords:
            doc.querySelector('meta[name="keywords"]')?.getAttribute("content") || "",
          ogTitle:
            doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || "",
          ogDescription:
            doc.querySelector('meta[property="og:description"]')?.getAttribute("content") || "",
          ogImage:
            doc.querySelector('meta[property="og:image"]')?.getAttribute("content") || "",
          charset: doc.querySelector("meta[charset]")?.getAttribute("charset") || "utf-8",
          viewport:
            doc.querySelector('meta[name="viewport"]')?.getAttribute("content") || "",
        };

        return {
          success: true,
          url,
          metadata,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      throw new Error(`Failed to extract metadata: ${(error as Error).message}`);
    }
  }

  /**
   * Validate URL
   */
  private validateUrl(url: string): void {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Only HTTP/HTTPS URLs allowed");
      }
    } catch (error) {
      throw new Error(`Invalid URL: ${url}`);
    }
  }
}

export const browserTool = new BrowserTool();
