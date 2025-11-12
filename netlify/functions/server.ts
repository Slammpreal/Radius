import type { Handler } from '@netlify/functions';
import Fastify from 'fastify';
import fastifyMiddie from '@fastify/middie';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { server as wisp } from '@mercuryworkshop/wisp-js/server';
import { createBareServer } from '@tomphttp/bare-server-node';
import { handler as astroHandler } from '../../dist/server/entry.mjs';
import { createServer } from 'node:http';
import { Socket } from 'node:net';
import http from 'node:http';
import https from 'node:https';

// Create agents that completely disable connection pooling
const httpAgent = new http.Agent({
    keepAlive: false,
    maxSockets: Infinity,
    maxFreeSockets: 0
});

const httpsAgent = new https.Agent({
    keepAlive: false,
    maxSockets: Infinity,
    maxFreeSockets: 0
});

// Remove connection limiter entirely
const bareServer = createBareServer('/bare/', {
    httpAgent: httpAgent,
    httpsAgent: httpsAgent,
    // @ts-ignore
    connectionLimiter: undefined
});

let app: any = null;

async function getApp() {
  if (app) return app;

  const serverFactory = (handler: any) => {
    const server = createServer()
      .on('request', (req, res) => {
        // Force close connections
        res.shouldKeepAlive = false;
        res.setHeader('Connection', 'close');
        
        if (bareServer.shouldRoute(req)) {
          bareServer.routeRequest(req, res);
        } else {
          handler(req, res);
        }
      })
      .on('upgrade', (req, socket, head) => {
        if (bareServer.shouldRoute(req)) {
          bareServer.routeUpgrade(req, socket as Socket, head);
        } else if (req.url?.endsWith('/wisp/') || req.url?.endsWith('/adblock/')) {
          wisp.routeRequest(req, socket as Socket, head);
        }
      })
      .on('connection', (socket) => {
        socket.setKeepAlive(false);
        socket.setTimeout(30000);
      });
    
    server.keepAliveTimeout = 0;
    server.headersTimeout = 1000;
    server.requestTimeout = 0;
    server.timeout = 0;
    
    return server;
  };

  app = Fastify({
    logger: false,
    ignoreDuplicateSlashes: true,
    ignoreTrailingSlash: true,
    serverFactory: serverFactory,
    connectionTimeout: 0,
    keepAliveTimeout: 0
  });

  await app.register(fastifyStatic, {
    root: fileURLToPath(new URL('../../dist/client', import.meta.url)),
  });

  await app.register(fastifyMiddie);
  await app.use(astroHandler);

  app.setNotFoundHandler((req: any, res: any) => {
    res.redirect('/404');
  });

  return app;
}

export const handler: Handler = async (event, context) => {
  const app = await getApp();
  
  return new Promise((resolve, reject) => {
    const req = {
      method: event.httpMethod,
      url: event.path + (event.queryStringParameters ? '?' + new URLSearchParams(event.queryStringParameters).toString() : ''),
      headers: event.headers,
      body: event.body,
    };

    app.inject(req, (err: any, res: any) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: res.payload,
        });
      }
    });
  });
};
