import type { Pool, QueryConfig } from 'pg';
import type { ConnectionOptions } from 'node:tls';
/**
 *  Based on Postgres QueryConfig to assist with postgres's query(queryConfig: PgQueryConfig)
 *
 * @interface
 */
export interface PgQueryConfig extends QueryConfig {
    text: string;
    values: unknown[];
}
/**
 * Given a certificate path provide database ssl connection options if cert is found
 *
 * @param {string} certPath
 * @returns {(ConnectionOptions | false)}
 */
export declare const getSSLConfig: (certPath: string) => ConnectionOptions | false;
export declare const isDatabaseReady: (db: Pool) => Promise<boolean>;
