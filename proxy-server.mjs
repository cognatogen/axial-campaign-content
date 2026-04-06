/**
 * Local CORS proxy for MediaWiki API requests.
 * Run with: npm run proxy
 */

import http from "node:http";

const PROXY_PORT = 30001;
let sessionCookies = "";

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:30000");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Wiki-Url");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const wikiApiUrl = req.headers["x-wiki-url"];
  if (!wikiApiUrl) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing X-Wiki-Url header" }));
    return;
  }

  // Collect body as raw Buffer (needed for multipart/binary uploads)
  const chunks = [];
  req.on("data", chunk => { chunks.push(chunk); });
  req.on("end", () => {
    const bodyBuffer = Buffer.concat(chunks);
    const incomingUrl = new URL(req.url, `http://localhost:${PROXY_PORT}`);
    const targetUrl = wikiApiUrl + incomingUrl.search;
    console.log(`[proxy] ${req.method} ${targetUrl}`);

    const headers = {
      "User-Agent": "AxialCampaignContent/1.0 (Foundry VTT Module)"
    };

    // Forward the Content-Type header as-is (important for multipart boundaries)
    if (req.headers["content-type"]) {
      headers["Content-Type"] = req.headers["content-type"];
    }

    if (sessionCookies) headers["Cookie"] = sessionCookies;

    const fetchOpts = {
      method: req.method,
      headers,
      redirect: "follow"
    };

    if (req.method === "POST" && bodyBuffer.length > 0) {
      fetchOpts.body = bodyBuffer;
    }

    fetch(targetUrl, fetchOpts)
      .then(wikiRes => {
        const setCookies = wikiRes.headers.getSetCookie?.() || [];
        if (setCookies.length > 0) {
          sessionCookies = setCookies.map(c => c.split(";")[0]).join("; ");
        }
        return wikiRes.text().then(text => ({
          status: wikiRes.status,
          contentType: wikiRes.headers.get("content-type"),
          text
        }));
      })
      .then(({ status, contentType, text }) => {
        console.log(`[proxy] Response: ${status}`);
        res.writeHead(200, {
          "Content-Type": contentType || "application/json",
          "Access-Control-Allow-Origin": "http://localhost:30000",
          "Access-Control-Allow-Credentials": "true"
        });
        res.end(text);
      })
      .catch(err => {
        console.error(`[proxy] Error: ${err.message}`);
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      });
  });
});

server.listen(PROXY_PORT, "127.0.0.1", () => {
  console.log(`Wiki proxy running at http://localhost:${PROXY_PORT}`);
  console.log("Press Ctrl+C to stop.");
});
