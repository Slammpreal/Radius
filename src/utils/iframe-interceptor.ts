/**
 * Iframe Interceptor Utility
 *
 * This module intercepts attempts to open new tabs or windows from within
 * the proxy iframe and redirects them to navigate within the same iframe instead.
 *
 * Works with both Scramjet and Ultraviolet web proxies, as well as Coris.
 *
 * Enhanced with CAPTCHA support to avoid interfering with CAPTCHA iframes and
 * proper handling of postMessage with MessagePort transfers.
 */

/**
 * CAPTCHA-related domains that should not have their windows.open intercepted
 */
const CAPTCHA_DOMAINS = [
    "recaptcha",
    "hcaptcha",
    "turnstile",
    "challenges.cloudflare.com",
    "gstatic.com/recaptcha"
];

/**
 * Check if a URL is related to a CAPTCHA provider
 */
function isCaptchaUrl(url: string): boolean {
    const urlLower = url.toLowerCase();
    return CAPTCHA_DOMAINS.some((domain) => urlLower.includes(domain));
}

/**
 * Inject interception script into the iframe's content window
 * This overrides window.open and modifies target="_blank" links
 *
 * @param iframeWindow - The iframe's contentWindow object
 * @param onNavigate - Callback function when navigation is intercepted
 */
export function injectIframeInterceptor(
    iframeWindow: Window,
    onNavigate: (url: string) => void
): void {
    if (!iframeWindow) {
        console.warn("Cannot inject interceptor: iframe window is null");
        return;
    }

    try {
        // Fix postMessage to properly handle MessagePort transfers
        // This prevents DataCloneError when CAPTCHA providers communicate
        fixPostMessage(iframeWindow);

        // Store the original window.open function
        const originalOpen = iframeWindow.open;

        // Override window.open to intercept new tab/window attempts
        iframeWindow.open = function (
            url?: string | URL,
            target?: string,
            features?: string
        ): Window | null {
            // If no URL provided, return null as there's nothing to navigate to
            if (!url) {
                console.warn("[Iframe Interceptor] window.open called without URL");
                return null;
            }

            const urlString = url.toString();

            // Don't intercept CAPTCHA-related window opens
            if (isCaptchaUrl(urlString)) {
                console.log(`[Iframe Interceptor] Allowing CAPTCHA window.open: ${urlString}`);
                return originalOpen?.call(iframeWindow, url, target, features) || null;
            }

            console.log(`[Iframe Interceptor] Intercepted window.open: ${urlString}`);

            // Instead of opening a new window, navigate the iframe
            onNavigate(urlString);

            // Return a Proxy object that mimics a Window to prevent errors
            return new Proxy({} as Window, {
                get() {
                    return null;
                },
                set() {
                    return true;
                }
            });
        };

        // Intercept clicks on links with target="_blank"
        const interceptTargetBlank = () => {
            const doc = iframeWindow.document;

            // Add event listener to intercept all clicks
            doc.addEventListener(
                "click",
                (event: MouseEvent) => {
                    let target = event.target as HTMLElement;

                    // Find the closest anchor element (in case the click is on a child element)
                    while (target && target.tagName !== "A") {
                        target = target.parentElement as HTMLElement;
                    }

                    if (target && target.tagName === "A") {
                        const anchor = target as HTMLAnchorElement;
                        const targetAttr = anchor.getAttribute("target");

                        // Check if the link targets a new window/tab
                        if (targetAttr === "_blank" || targetAttr === "_new") {
                            event.preventDefault();
                            event.stopPropagation();

                            const href = anchor.href;
                            if (href) {
                                console.log(
                                    `[Iframe Interceptor] Intercepted target="_blank" link: ${href}`
                                );
                                onNavigate(href);
                            }
                        }
                    }
                },
                true
            ); // Use capture phase to ensure we intercept before other handlers

            // Also use MutationObserver to catch dynamically added links
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        // Check if it's an Element node (nodeType === 1)
                        if (node.nodeType !== 1) return;

                        if (node instanceof HTMLAnchorElement) {
                            const targetAttr = node.getAttribute("target");
                            if (targetAttr === "_blank" || targetAttr === "_new") {
                                // Remove the target attribute to prevent new tab
                                node.removeAttribute("target");
                            }
                        } else if (node instanceof HTMLElement) {
                            // Check for anchor elements within the added node
                            const anchors = node.querySelectorAll(
                                'a[target="_blank"], a[target="_new"]'
                            );
                            anchors.forEach((anchor) => {
                                anchor.removeAttribute("target");
                            });
                        }
                    });
                });
            });

            // Ensure we have a valid target for observation before starting
            const observeTarget = doc.body || doc.documentElement;
            if (observeTarget) {
                observer.observe(observeTarget, {
                    childList: true,
                    subtree: true
                });
            } else {
                console.warn("[Iframe Interceptor] No valid target for MutationObserver");
            }
        };

        // Run the interception setup
        if (iframeWindow.document.readyState === "loading") {
            iframeWindow.document.addEventListener("DOMContentLoaded", interceptTargetBlank);
        } else {
            interceptTargetBlank();
        }

        console.log("[Iframe Interceptor] Successfully injected interceptor");
    } catch (error) {
        // This can fail due to cross-origin restrictions, which is expected
        // for some iframe content. In those cases, the proxy's own rewriting
        // should handle it at the service worker level.
        console.warn("[Iframe Interceptor] Could not inject (likely cross-origin):", error);
    }
}

/**
 * Setup interceptor for an iframe element
 * This handles the setup and manages iframe load events
 *
 * @param iframe - The iframe HTML element
 * @param encodeURL - Function to encode URLs for the proxy
 */
export function setupIframeInterceptor(
    iframe: HTMLIFrameElement,
    encodeURL: (url: string) => string
): void {
    const handleIframeLoad = () => {
        const iframeWindow = iframe.contentWindow;

        if (!iframeWindow) {
            console.warn("Iframe contentWindow is null");
            return;
        }

        // Inject the interceptor with a navigation handler
        injectIframeInterceptor(iframeWindow, (url: string) => {
            // When a new tab/window is intercepted, navigate the iframe instead
            iframe.src = encodeURL(url);
        });
    };

    // Listen for iframe load events
    iframe.addEventListener("load", handleIframeLoad);

    // If the iframe is already loaded, inject immediately
    if (iframe.contentWindow && iframe.contentWindow.document.readyState === "complete") {
        handleIframeLoad();
    }
}

/**
 * Fix postMessage to properly handle MessagePort transfers
 * This prevents DataCloneError when CAPTCHA providers communicate between frames
 *
 * @param targetWindow - The window object to fix postMessage on
 */
function fixPostMessage(targetWindow: Window): void {
    if (!targetWindow || !targetWindow.postMessage) return;

    try {
        // Store the original postMessage
        const originalPostMessage = targetWindow.postMessage.bind(targetWindow);

        // Create a wrapper that properly handles MessagePort transfers
        targetWindow.postMessage = function (
            message: any,
            targetOriginOrOptions?: string | WindowPostMessageOptions,
            transfer?: Transferable[]
        ) {
            try {
                // Handle both function signatures:
                // postMessage(message, targetOrigin, transfer)
                // postMessage(message, options)
                if (
                    typeof targetOriginOrOptions === "object" &&
                    targetOriginOrOptions !== null &&
                    !Array.isArray(targetOriginOrOptions)
                ) {
                    // New signature with options object
                    const options = { ...targetOriginOrOptions } as WindowPostMessageOptions;

                    // Ensure transfer array contains only valid transferables
                    if (options.transfer && Array.isArray(options.transfer)) {
                        options.transfer = filterValidTransferables(options.transfer);
                    }

                    return originalPostMessage(message, options);
                }

                // Old signature with targetOrigin string
                const targetOrigin =
                    typeof targetOriginOrOptions === "string" ? targetOriginOrOptions : "*";

                // Filter transfer array to only include valid transferables
                const validTransfer =
                    transfer && Array.isArray(transfer)
                        ? filterValidTransferables(transfer)
                        : undefined;

                return originalPostMessage(message, targetOrigin, validTransfer);
            } catch (error) {
                // If the call fails with DataCloneError, try without transfer
                if (error instanceof DOMException && error.name === "DataCloneError") {
                    console.warn(
                        "[Iframe Interceptor] postMessage failed with DataCloneError, retrying without transfer"
                    );
                    try {
                        if (
                            typeof targetOriginOrOptions === "object" &&
                            targetOriginOrOptions !== null
                        ) {
                            const fallbackOptions = {
                                ...targetOriginOrOptions
                            } as WindowPostMessageOptions;
                            delete fallbackOptions.transfer;
                            return originalPostMessage(message, fallbackOptions);
                        }
                        const fallbackOrigin =
                            typeof targetOriginOrOptions === "string" ? targetOriginOrOptions : "*";
                        return originalPostMessage(message, fallbackOrigin);
                    } catch (retryError) {
                        console.error("[Iframe Interceptor] postMessage retry failed:", retryError);
                        throw retryError;
                    }
                }
                throw error;
            }
        };
    } catch (e) {
        // If we can't override postMessage (e.g., cross-origin), that's fine
        console.warn("[Iframe Interceptor] Could not fix postMessage:", e);
    }
}

/**
 * Filter transferable objects to ensure only valid ones are included
 */
function filterValidTransferables(transfer: Transferable[]): Transferable[] {
    return transfer.filter((item) => {
        // Check for valid transferable types
        return (
            item instanceof ArrayBuffer ||
            item instanceof MessagePort ||
            (typeof ImageBitmap !== "undefined" && item instanceof ImageBitmap) ||
            (typeof OffscreenCanvas !== "undefined" && item instanceof OffscreenCanvas) ||
            (typeof ReadableStream !== "undefined" && item instanceof ReadableStream) ||
            (typeof WritableStream !== "undefined" && item instanceof WritableStream) ||
            (typeof TransformStream !== "undefined" && item instanceof TransformStream)
        );
    });
}
