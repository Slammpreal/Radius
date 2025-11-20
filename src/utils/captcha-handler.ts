/**
 * Enhanced CAPTCHA and Cloudflare verification handler
 * This module ensures that reCAPTCHA, hCaptcha, and Cloudflare Turnstile
 * work seamlessly within the proxy environment
 */

/**
 * List of CAPTCHA and verification-related domains
 */
const CAPTCHA_DOMAINS = [
    "google.com",
    "recaptcha.net",
    "gstatic.com",
    "hcaptcha.com",
    "cloudflare.com",
    "challenges.cloudflare.com",
    "yandex.com",
    "yandex.ru",
    "smartcaptcha.yandexcloud.net"
];

/**
 * Initialize CAPTCHA handlers on page load
 * This ensures that CAPTCHA widgets can properly communicate with their APIs
 */
export function initializeCaptchaHandlers() {
    if (typeof window === "undefined") return;

    // Fix MessagePort cloning errors for CAPTCHA iframes
    fixMessagePortCloning();

    // Add missing Cloudflare challenge solver functions
    addCloudflareChallengeHandlers();

    // Ensure global CAPTCHA callbacks are accessible
    if (!window.___grecaptcha_cfg) {
        window.___grecaptcha_cfg = { clients: {} };
    }

    // Monitor for CAPTCHA iframe creation and ensure proper setup
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node instanceof HTMLIFrameElement) {
                    const src = node.src || "";
                    // Check if this is a CAPTCHA iframe
                    if (
                        src.includes("recaptcha") ||
                        src.includes("hcaptcha") ||
                        src.includes("challenges.cloudflare.com") ||
                        src.includes("turnstile")
                    ) {
                        // Ensure the iframe has proper sandbox permissions
                        if (node.sandbox && node.sandbox.length > 0) {
                            node.sandbox.add("allow-same-origin");
                            node.sandbox.add("allow-scripts");
                            node.sandbox.add("allow-forms");
                        }

                        // Ensure credentials are included for CAPTCHA cookies
                        if (node.getAttribute("credentialless") !== null) {
                            node.removeAttribute("credentialless");
                        }
                    }
                }
            });
        });
    });

    // Start observing the document for changes
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // Ensure cookies are properly handled for CAPTCHA tokens
    enhanceCookieHandling();

    // Enhance fetch and XMLHttpRequest for CAPTCHA requests
    enhanceNetworkRequests();
}

/**
 * Fix MessagePort cloning errors that occur in CAPTCHA iframes
 * This prevents "DataCloneError: Failed to execute 'postMessage' on 'Window'" errors
 */
function fixMessagePortCloning() {
    const originalPostMessage = window.postMessage.bind(window);

    // Override postMessage to properly handle MessagePort transfers
    (window as any).postMessage = function (message: any, ...args: any[]) {
        try {
            // Handle both old (targetOrigin, transfer) and new (options) signatures
            const targetOrigin = typeof args[0] === "string" ? args[0] : "*";
            let transfer = args[1];

            // Handle new WindowPostMessageOptions signature
            if (typeof args[0] === "object" && args[0] !== null && "targetOrigin" in args[0]) {
                const options = args[0] as WindowPostMessageOptions;
                transfer = options.transfer;
                return originalPostMessage(message, options);
            }

            // If transfer array contains MessagePort objects, ensure they are properly transferred
            if (transfer && Array.isArray(transfer)) {
                const hasMessagePort = transfer.some(
                    (item: any) =>
                        item instanceof MessagePort || item?.constructor?.name === "MessagePort"
                );

                if (hasMessagePort) {
                    // Use the transfer parameter explicitly
                    return originalPostMessage(message, targetOrigin, transfer);
                }
            }

            // For other cases, check if message contains MessagePort and auto-detect transfer
            if (message && typeof message === "object") {
                const ports: MessagePort[] = [];
                const collectPorts = (obj: any) => {
                    if (obj instanceof MessagePort || obj?.constructor?.name === "MessagePort") {
                        ports.push(obj);
                    } else if (obj && typeof obj === "object") {
                        for (const key in obj) {
                            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                                collectPorts(obj[key]);
                            }
                        }
                    }
                };
                collectPorts(message);

                if (ports.length > 0) {
                    // Auto-transfer detected MessagePorts
                    return originalPostMessage(message, targetOrigin, ports);
                }
            }

            // Standard call
            if (transfer !== undefined) {
                return originalPostMessage(message, targetOrigin, transfer);
            } else {
                return originalPostMessage(message, targetOrigin);
            }
        } catch (error) {
            // Fallback: try without transfer parameter
            console.warn("postMessage transfer failed, attempting without transfer:", error);
            try {
                const targetOrigin = typeof args[0] === "string" ? args[0] : "*";
                return originalPostMessage(message, targetOrigin);
            } catch (fallbackError) {
                console.error("postMessage completely failed:", fallbackError);
                throw fallbackError;
            }
        }
    };
}

/**
 * Add missing Cloudflare challenge solver functions
 * This fixes "ReferenceError: solveSimpleChallenge is not defined" errors
 */
function addCloudflareChallengeHandlers() {
    // Define solveSimpleChallenge for Cloudflare Turnstile/Challenge pages
    if (typeof (window as any).solveSimpleChallenge === "undefined") {
        (window as any).solveSimpleChallenge = function () {
            console.log("Simple challenge solver called");
            // The actual challenge solving is handled by Cloudflare's scripts
            // This function just needs to exist to prevent the ReferenceError
        };
    }

    // Add support for managed challenge callback
    if (typeof (window as any).managedChallengeCallback === "undefined") {
        (window as any).managedChallengeCallback = function (token: string) {
            console.log("Managed challenge callback:", token);
            // Handle the challenge token
        };
    }

    // Add support for interactive challenge
    if (typeof (window as any).interactiveChallenge === "undefined") {
        (window as any).interactiveChallenge = function () {
            console.log("Interactive challenge called");
        };
    }
}

/**
 * Enhance cookie handling to ensure CAPTCHA tokens are properly stored
 */
function enhanceCookieHandling() {
    // Store original cookie descriptor
    const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");

    if (originalCookieDescriptor) {
        Object.defineProperty(document, "cookie", {
            get() {
                return originalCookieDescriptor.get?.call(this) || "";
            },
            set(value) {
                // Ensure SameSite=None for CAPTCHA cookies in cross-origin iframes
                if (typeof value === "string" && value.includes("_GRECAPTCHA")) {
                    if (!value.includes("SameSite")) {
                        value += "; SameSite=None; Secure";
                    }
                }
                originalCookieDescriptor.set?.call(this, value);
            },
            configurable: true
        });
    }
}

/**
 * Enhance network requests to properly handle CAPTCHA API calls
 */
function enhanceNetworkRequests() {
    // Store original fetch
    const originalFetch = window.fetch;

    // Override fetch to ensure proper headers for CAPTCHA requests
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
        const url =
            typeof input === "string"
                ? input
                : input instanceof Request
                  ? input.url
                  : input.toString();

        // Check if this is a CAPTCHA-related request
        const isCaptchaRequest = CAPTCHA_DOMAINS.some((domain) => url.includes(domain));

        if (isCaptchaRequest) {
            // Ensure credentials are included
            init = init || {};
            if (!init.credentials) {
                init.credentials = "include";
            }

            // Ensure proper headers
            init.headers = new Headers(init.headers);
            if (!init.headers.has("Accept")) {
                init.headers.set("Accept", "*/*");
            }

            // Set mode to cors for CAPTCHA requests to avoid CORS issues
            if (!init.mode || init.mode === "navigate") {
                init.mode = "cors";
            }
        }

        return originalFetch.call(this, input, init).catch((error) => {
            // Enhanced error handling for CAPTCHA requests
            if (isCaptchaRequest) {
                console.warn("CAPTCHA fetch error:", url, error);
                // Try again without custom init for preload compatibility
                if (init && (init.credentials || init.mode)) {
                    console.log("Retrying CAPTCHA request with default settings");
                    return originalFetch.call(this, input, { credentials: "include" });
                }
            }
            throw error;
        });
    };

    // Store original XMLHttpRequest
    const OriginalXHR = window.XMLHttpRequest;

    // Override XMLHttpRequest for CAPTCHA requests
    window.XMLHttpRequest = function (this: XMLHttpRequest) {
        const xhr = new OriginalXHR();

        // Store original open method
        const originalOpen = xhr.open;
        xhr.open = function (
            method: string,
            url: string | URL,
            async: boolean = true,
            username?: string | null,
            password?: string | null
        ) {
            const urlStr = url.toString();
            const isCaptchaRequest = CAPTCHA_DOMAINS.some((domain) => urlStr.includes(domain));

            if (isCaptchaRequest) {
                // Ensure credentials are included for CAPTCHA requests
                xhr.withCredentials = true;
            }

            if (username !== undefined && password !== undefined) {
                return originalOpen.call(this, method, url, async, username, password);
            } else if (username !== undefined) {
                return originalOpen.call(this, method, url, async, username);
            } else {
                return originalOpen.call(this, method, url, async);
            }
        };

        return xhr;
    } as any;

    // Copy static properties
    Object.setPrototypeOf(window.XMLHttpRequest, OriginalXHR);
    Object.setPrototypeOf(window.XMLHttpRequest.prototype, OriginalXHR.prototype);

    // Fix preload resource loading for CAPTCHA scripts
    enhancePreloadHandling();
}

/**
 * Enhance preload handling to fix credential mode mismatches
 */
function enhancePreloadHandling() {
    // Monitor for link elements being added to the page
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node instanceof HTMLLinkElement && node.rel === "preload") {
                    const href = node.href || "";
                    // Check if this is a CAPTCHA-related resource
                    if (CAPTCHA_DOMAINS.some((domain) => href.includes(domain))) {
                        // Ensure crossorigin attribute is set for proper credential handling
                        if (!node.hasAttribute("crossorigin")) {
                            node.setAttribute("crossorigin", "use-credentials");
                        }
                    }
                }
                // Also handle script tags that might be preloaded
                if (node instanceof HTMLScriptElement) {
                    const src = node.src || "";
                    if (CAPTCHA_DOMAINS.some((domain) => src.includes(domain))) {
                        // Ensure crossorigin attribute is set
                        if (!node.hasAttribute("crossorigin")) {
                            node.setAttribute("crossorigin", "use-credentials");
                        }
                    }
                }
            });
        });
    });

    // Start observing
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
}

/**
 * Global declaration for reCAPTCHA config
 */
declare global {
    interface Window {
        ___grecaptcha_cfg?: {
            clients: Record<string, any>;
            [key: string]: any;
        };
    }
}
