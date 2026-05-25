import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Common scraper, crawler, and automated bot User-Agent signatures
const BLOCKED_USER_AGENTS = [
  "scrapy",
  "python",
  "urllib",
  "requests",
  "beautifulsoup",
  "curl",
  "wget",
  "axios",
  "headless",
  "puppeteer",
  "playwright",
  "selenium",
  "phantomjs",
  "httrack",
  "go-http-client",
  "java/",
  "postman",
  "insomnia",
  "libwww",
  "perl",
  "php/",
  "nmap",
  "sqlmap",
];

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get("user-agent")?.toLowerCase() || "";
  const host = request.headers.get("host") || "";

  // Allow local development and loopback requests to avoid blocking local tools/healthchecks
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    return NextResponse.next();
  }

  // Detect automated scrapers/bots by signature
  const isBotOrScraper = BLOCKED_USER_AGENTS.some((agent) => userAgent.includes(agent));

  if (isBotOrScraper) {
    return new NextResponse(
      JSON.stringify({ 
        error: "Access Denied", 
        message: "Automated crawling and scraping activity is prohibited to boost platform security." 
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes except Next.js internals, static files, and favicon
  matcher: [
    "/((?!_next/static|_next/image|assets/|favicon.ico|manifest.webmanifest).*)",
  ],
};
