<p align="center">
    <a href="https://radiusproxy.app">
        <img src="public/favicon.png" alt="Radius logo" width="150">
    </a>
</p>

# [Radius](https://radiusproxy.app)
![Stars](https://shields.io/github/stars/RadiusProxy/Radius?style=flat-square&logo=github)
![Forks](https://shields.io/github/forks/RadiusProxy/Radius?style=flat-square&logo=github)
![Last Commit](https://shields.io/github/last-commit/RadiusProxy/Radius?style=flat-square&logo=github)

Radius is a simple and clean web proxy designed for speed and ease-of-use, made in Astro.

Join the [Discord!](https://discord.gg/cCfytCX6Sv) (Or [TitaniumNetwork's](https://discord.gg/unblock))

## How to support Radius 
You can donate at https://hcb.hackclub.com/donations/start/radius

If you can't donate, tell your friends about Radius!

## Tech Stack
[Astro](https://astro.build) - Server-side rendering and static site generation<br>
[Fastify](https://fastify.dev) - HTTP server <br>
[Vite](https://vite.dev) - Build system <br>
[TailwindCSS](https://tailwindcss.com) - CSS framework <br>
[Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet) - Web proxy <br>
[Scramjet](https://github.com/MercuryWorkshop/Scramjet) - Web proxy <br>
[Wisp-js](https://github.com/MercuryWorkshop/wisp-js) - Wisp server and client in JavaScript <br>
[Bare-mux](https://github.com/MercuryWorkshop/bare-mux) - Modular implementation of the Bare client interface <br>
[EpoxyTransport](https://github.com/MercuryWorkshop/EpoxyTransport) Bare-mux transport using epoxy-tls <br>
[CurlTransport](https://github.com/MercuryWorkshop/CurlTransport) Bare-mux transport using libcurl.js <br>

# Setup
Setting Up Raduius is simple and convinent, for (`pnpm`), run
```bash
git clone https://github.com/RadiusProxy/Radius
cd Radius
pnpm i
pnpm bstart
```
Radius will run on port 8080 by default, or 4321 for a dev environment (`pnpm dev`).

> [!CAUTION]
> The Bare Server WILL NOT WORK using (`npm run dev`) which will lead to lack of functionality, however the wisp server and basic proxy system will still be functional

And for (`npm`), run
```bash
# Bare Server WILL NOT WORK due to npm run dev
git clone https://github.com/RadiusProxy/Radius
cd Radius
npm install
npm run dev
```

# Deployment

Radius can be easily deployed to various platforms with full backend functionality. 

**📖 For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)**

## Quick Deploy

Choose your preferred platform:

## Deploy to Heroku
[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/RadiusProxy/Radius)

Heroku fully supports WebSocket connections and is recommended for production deployments.

1. Click the "Deploy to Heroku" button above
2. Fill in the required information
3. Click "Deploy app"

**Manual deployment:**
```bash
heroku create your-app-name
git push heroku main
```

## Deploy to Replit
[![Run on Replit](https://replit.com/badge/github/RadiusProxy/Radius)](https://replit.com/new/github/RadiusProxy/Radius)

1. Click the "Run on Replit" button above
2. The `.replit` and `replit.nix` configurations will automatically set up the environment
3. Click "Run" to start the server
4. Your app will be available at the Replit URL

## Deploy to CodeSandbox
[![Edit in CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/github/RadiusProxy/Radius)

1. Click the "Edit in CodeSandbox" button above
2. The `.codesandbox/tasks.json` configuration will automatically set up the tasks
3. Run the "Start Production Server" task to launch the app

## Deploy with Docker

Radius includes a Dockerfile for containerized deployments:

```bash
# Build the Docker image
docker build -t radius .

# Run the container
docker run -p 8080:8080 radius
```

Or using Docker Compose:

```yaml
version: '3.8'
services:
  radius:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
    restart: unless-stopped
```

## Environment Variables
All platforms support the following environment variable:
- `PORT` - The port number to run the server on (default: 8080)

## Platform Compatibility Notes
- **Heroku, Replit, CodeSandbox, Render, Railway**: Full support for WebSocket connections and all proxy features
- **Vercel, Netlify**: Limited WebSocket support; some proxy features may not work as expected. These platforms work best for static content and serverless functions but may have limitations with the proxy backend.

## Don't Want To Deploy But The Link Is Inexcessable?
Don't Wory. add this html script into any basic Website builder
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Radius</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /*
        Custom CSS to ensure the HTML and IFRAME take up the entire viewport
        and remove default margin/scrolling.
        */
        html, body {
            height: 100%;
            margin: 0;
            overflow: hidden;
            font-family: 'Inter', sans-serif;
        }

        iframe {
            border: none;
            width: 100%;
            height: 100%;
        }
    </style>
</head>
<body>

    <!--
    The IFRAME is set to fill the entire viewport.
    The sandbox attribute is loaded with all possible allowed tokens for maxamum functionality
    -->
    <iframe
        id="fullPageFrame"
        src="https://example.com"
        title="Sandboxed Content"
        allow="fullscreen"
        sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation allow-top-navigation-by-user-activation"
    >
        Your browser does not support iframes, please swich to a supported browser. You can find supported browsers at https://caniuse.com/?search=iframe or go to https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe for more information.
    </iframe>
    <!--
    For a custom deployment, enter your URL.
    -->
</body>
</html>
```

# Credits
[Owski](https://github.com/unretain) - Owner <br>
[proudparrot2](https://github.com/proudparrot2) - Founder and original dev <br>
[MotorTruck1221](https://github.com/motortruck1221) - Astro rewrite and lead dev <br>
[All of the contributors!](https://github.com/RadiusProxy/Radius/graphs/contributors)



