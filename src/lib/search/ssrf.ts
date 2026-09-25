/**
 * Validates that a URL is a legitimate public HTTPS URL.
 * Protects against SSRF, internal network exploration, and non-web protocols.
 */
export function isSafeHttpsUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== "string") {
    return false;
  }

  try {
    const parsed = new URL(rawUrl.trim());

    // 1. Strict protocol requirement: HTTPS ONLY
    if (parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase().trim();
    if (!hostname) {
      return false;
    }

    // 2. Reject localhost and local/internal domain suffixes
    const forbiddenSuffixes = [
      "localhost",
      ".localhost",
      ".local",
      ".internal",
      ".lan",
      ".home.arpa",
      ".onion",
    ];

    if (
      hostname === "localhost" ||
      forbiddenSuffixes.some((suffix) => hostname.endsWith(suffix))
    ) {
      return false;
    }

    // 3. Reject IPv4 loopback, private, and link-local ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipv4Match = hostname.match(ipv4Regex);
    if (ipv4Match) {
      const octet1 = parseInt(ipv4Match[1], 10);
      const octet2 = parseInt(ipv4Match[2], 10);
      const octet3 = parseInt(ipv4Match[3], 10);
      const octet4 = parseInt(ipv4Match[4], 10);

      // Validate all octets in [0, 255]
      if ([octet1, octet2, octet3, octet4].some((o) => o < 0 || o > 255)) {
        return false;
      }

      // 0.0.0.0/8 (Current network)
      if (octet1 === 0) return false;

      // 10.0.0.0/8 (Private network)
      if (octet1 === 10) return false;

      // 127.0.0.0/8 (Loopback)
      if (octet1 === 127) return false;

      // 169.254.0.0/16 (Link-local / Cloud metadata like 169.254.169.254)
      if (octet1 === 169 && octet2 === 254) return false;

      // 172.16.0.0/12 (Private network: 172.16.x.x - 172.31.x.x)
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return false;

      // 192.168.0.0/16 (Private network)
      if (octet1 === 192 && octet2 === 168) return false;

      // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
      if (octet1 >= 224) return false;
    }

    // 4. Reject IPv6 loopback, link-local, and unique local
    if (
      hostname.startsWith("[") ||
      hostname.includes(":") ||
      hostname === "::1" ||
      hostname.startsWith("fe80:") ||
      hostname.startsWith("fc00:") ||
      hostname.startsWith("fd")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Normalizes a URL for deduplication and display:
 * - Strips hash fragment
 * - Strips redundant trailing slash
 */
export function normalizeCanonicalUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    parsed.hash = ""; // Strip hash
    let href = parsed.toString();
    if (href.endsWith("/")) {
      href = href.slice(0, -1);
    }
    return href;
  } catch {
    return rawUrl.trim();
  }
}

/**
 * Extracts a clean hostname for display (e.g. "github.com", "developer.mozilla.org").
 */
export function extractCleanHostname(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}
