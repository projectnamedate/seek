import pino, { type Logger, type LoggerOptions } from 'pino';
import { config } from '../config';

/**
 * Structured logger. One JSON line per event. Includes request IDs when used
 * via the pino-http middleware, so Railway/Datadog can correlate a request's
 * entire lifecycle with a single grep.
 *
 * In development, logs are pretty-printed to stdout. In production they are
 * raw JSON for ingestion.
 */
const baseOptions: LoggerOptions = {
  level: config.server.isDev ? 'debug' : 'info',
  base: {
    env: config.server.nodeEnv,
    network: config.solana.network,
  },
  // Redact known-sensitive fields before they hit the log sink.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-wallet-signature"]',
      'req.body.photo',
      'req.body.attestation',
      '*.privateKey',
      '*.authorityPrivateKey',
      '*.hotAuthorityPrivateKey',
    ],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

const transport = config.server.isDev
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname,env,network',
      },
    }
  : undefined;

export const logger: Logger = transport
  ? pino({ ...baseOptions, transport })
  : pino(baseOptions);

/** Child logger for a specific subsystem — stamps a `ns` field on every line. */
export function childLogger(namespace: string): Logger {
  return logger.child({ ns: namespace });
}
