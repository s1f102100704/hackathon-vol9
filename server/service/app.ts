import cookie from '@fastify/cookie';
import fastifyEtag from '@fastify/etag';
import helmet from '@fastify/helmet';
import fastifyHttpProxy from '@fastify/http-proxy';
import type { TokenOrHeader } from '@fastify/jwt';
import fastifyJwt from '@fastify/jwt';
import fastifyWebsocket from '@fastify/websocket';
import assert from 'assert';
import { IS_PROD, WS_PATH } from 'common/constants';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import Fastify from 'fastify';
import buildGetJwks from 'get-jwks';
import server from '../$server';
import { COOKIE_NAME } from './constants';
import {
  API_BASE_PATH,
  COGNITO_POOL_ENDPOINT,
  COGNITO_USER_POOL_CLIENT_ID,
  COGNITO_USER_POOL_ID,
  SERVER_PORT,
} from './envValues';
import type { JwtUser } from './types';
import { websocket } from './websocket';

export const init = (): FastifyInstance => {
  const fastify = Fastify();
  const getJwks = buildGetJwks();

  fastify.register(helmet);
  fastify.register(fastifyEtag, { weak: true });
  fastify.register(cookie);

  fastify.register(fastifyJwt, {
    cookie: { cookieName: COOKIE_NAME, signed: false },
    decode: { complete: true },
    secret: (_: FastifyRequest, token: TokenOrHeader) => {
      assert('header' in token);
      assert(token.payload.aud === COGNITO_USER_POOL_CLIENT_ID);

      const domain = `${COGNITO_POOL_ENDPOINT}/${COGNITO_USER_POOL_ID}`;

      return getJwks.getPublicKey({ kid: token.header.kid, domain, alg: token.header.alg });
    },
  });

  if (IS_PROD) {
    fastify.register(fastifyHttpProxy, {
      upstream: `http://localhost:${SERVER_PORT + 1}`,
      replyOptions: {
        rewriteHeaders: (headers) => ({ ...headers, 'content-security-policy': undefined }),
      },
    });
  }

  fastify.register(fastifyWebsocket);
  fastify.register(async (fastify) => {
    websocket.init(fastify);

    fastify.get(WS_PATH, { websocket: true }, async (socket, req) => {
      await req
        .jwtVerify<JwtUser>({ onlyCookie: true })
        .then((user) => websocket.add(user.sub, socket))
        .catch((e) => socket.close(401, e.message));
    });
  });

  server(fastify, { basePath: API_BASE_PATH });

  return fastify;
};
