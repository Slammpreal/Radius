# Iframe Interception System

## Overview

This document describes the iframe interception system that prevents proxied content from opening new tabs or windows. Instead, all attempts to open new tabs/windows are redirected to navigate within the main iframe.

## Problem Statement

When using web proxies like Scramjet and Ultraviolet within an iframe, websites often try to open links in new tabs or windows using:
- `window.open()` JavaScript calls
- HTML links with `target="_blank"` attribute
- HTML links with `target="_new"` attribute

These attempts would break out of the iframe and open in the browser's new tab/window, disrupting the proxy experience.

## Solution Architecture

The implementation uses a **dual-layer approach** to ensure comprehensive coverage:

### Layer 1: Client-Side Interception

**File:** `src/utils/iframe-interceptor.ts`

This module provides client-side JavaScript that runs in the parent page and manipulates the iframe's `contentWindow`.

**Key Features:**
- Overrides `window.open()` to redirect to iframe navigation
- Intercepts click events on `target="_blank"` links
- Uses `MutationObserver` to catch dynamically added links
- Gracefully handles cross-origin restrictions

**Integration:** Called from `src/pages/index.astro` on iframe initialization:
```typescript
setupIframeInterceptor(iframe, (url: string) => sw.encodeURL(url));
```

### Layer 2: Service Worker Script Injection

**File:** `public/sw.js`

The service worker injects an interceptor script into all proxied HTML responses at the proxy level.

**Key Features:**
- Injects script into HTML responses from both Scramjet and Ultraviolet
- Works when client-side injection fails due to cross-origin restrictions
- Overrides `window.open()` at page load time
- Removes `target="_blank"` from all links (static and dynamic)
- Uses `MutationObserver` for dynamic content

**Injection Points:**
- After `<head>` tag
- After `<body>` tag (fallback)
- After `<html>` tag (second fallback)

## How It Works

### Client-Side Flow

1. User enters a URL in the search bar
2. `setupIframeInterceptor()` is called with the iframe element
3. Event listener is attached to iframe's `load` event
4. When iframe loads, `injectIframeInterceptor()` is called
5. Inside the iframe's `contentWindow`:
   - `window.open` is overridden to call the navigation callback
   - Click event listener is added to intercept `target="_blank"` links
   - `MutationObserver` watches for dynamically added links
6. When a new tab/window attempt is detected:
   - The intercepted URL is passed to the callback
   - The callback encodes the URL using `sw.encodeURL()`
   - The iframe's `src` is updated to navigate to the new URL

### Service Worker Flow

1. Browser requests a proxied page
2. Service worker intercepts the fetch event
3. Response is fetched via Scramjet or Ultraviolet
4. If response is HTML, `injectInterceptorScript()` is called
5. Interceptor script is injected into the HTML
6. Modified HTML is returned to the browser
7. When the page loads in the iframe:
   - Interceptor script runs automatically
   - `window.open` is overridden
   - All `target="_blank"` links have the attribute removed
   - `MutationObserver` watches for new links

## Compatibility

### Proxy Systems
- ✅ **Scramjet**: Fully supported
- ✅ **Ultraviolet**: Fully supported
- ✅ **Coris**: Compatible (uses standard window.open and target attributes)

### Browser Support
- ✅ Chrome/Edge (Chromium-based)
- ✅ Firefox
- ✅ Safari
- ✅ Any browser supporting Service Workers and MutationObserver

### Existing Features
The interception system is designed to work alongside existing features:
- ✅ CAPTCHA handling (captcha-handler.ts)
- ✅ Heavy cookie sites
- ✅ Service worker support
- ✅ Cloaking features
- ✅ All proxy settings and configurations

## Testing

To test the interception system:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Load a website with external links:**
   - Enter a URL like `https://example.com` or `https://wikipedia.org`
   - Wait for the page to load

3. **Test window.open interception:**
   - Find a button or link that calls `window.open()`
   - Click it and verify the URL loads in the iframe instead of a new tab

4. **Test target="_blank" interception:**
   - Find a link with `target="_blank"`
   - Click it and verify the URL loads in the iframe instead of a new tab
   - Open browser DevTools and check the Network tab to see the navigation

5. **Test dynamic content:**
   - Navigate to a site with infinite scroll or dynamic content
   - Verify that dynamically added links also navigate within the iframe

6. **Check console logs:**
   - Open browser DevTools Console
   - Look for log messages like:
     - `[Iframe Interceptor] Successfully injected interceptor`
     - `[Iframe Interceptor] Intercepted window.open: <url>`
     - `[Iframe Interceptor] Intercepted target="_blank" link: <url>`
     - `[Proxy Interceptor] Redirecting window.open to same window: <url>`

## Troubleshooting

### Links still open in new tabs

**Possible causes:**
1. Service worker not registered or updated
2. Cross-origin restrictions preventing client-side injection
3. Website using unusual popup methods

**Solutions:**
1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache and service worker
3. Check browser console for errors
4. Verify both layers are working by checking console logs

### Console shows cross-origin errors

This is expected and handled gracefully. The client-side interceptor will fail for cross-origin iframes, but the service worker layer will still work.

### Page behaves differently

Some websites may legitimately need popups for features like OAuth authentication or payment processing. In those cases, the interception can be temporarily disabled by commenting out the `setupIframeInterceptor()` call in `src/pages/index.astro`.

## Performance Impact

- **Client-Side:** Minimal - only adds event listeners and mutation observer to iframe
- **Service Worker:** Minimal - only adds HTML text processing for proxied pages
- **Memory:** Negligible - small script injection and observer cleanup on page unload
- **Network:** No additional network requests

## Future Enhancements

Potential improvements for future versions:

1. **Whitelist System:** Allow certain URLs to open in new tabs (e.g., OAuth providers)
2. **User Preference:** Toggle to enable/disable interception
3. **Smart Detection:** Detect legitimate popup needs (OAuth, payments) and handle appropriately
4. **Tab Management:** Create a tab system within the iframe for multi-tab browsing
5. **History Management:** Better back/forward button support for intercepted navigations

## Code References

- **Client-side interceptor:** `src/utils/iframe-interceptor.ts`
- **Integration point:** `src/pages/index.astro` (line 43, 68)
- **Service worker injection:** `public/sw.js` (INTERCEPTOR_SCRIPT constant and injectInterceptorScript function)
- **Documentation:** This file (`IFRAME_INTERCEPTION.md`)
