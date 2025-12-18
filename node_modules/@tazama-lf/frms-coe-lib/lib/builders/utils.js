"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDatabaseReady = exports.getSSLConfig = void 0;
const tslib_1 = require("tslib");
const fs = tslib_1.__importStar(require("node:fs"));
/**
 * Given a certificate path provide database ssl connection options if cert is found
 *
 * @param {string} certPath
 * @returns {(ConnectionOptions | false)}
 */
const getSSLConfig = (certPath) => {
    if (!fs.existsSync(certPath))
        return false;
    return {
        // rejectUnauthorized: false,
        ca: [fs.readFileSync(certPath).toString()],
    };
};
exports.getSSLConfig = getSSLConfig;
const isDatabaseReady = async (db) => {
    const client = await db.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
};
exports.isDatabaseReady = isDatabaseReady;
//# sourceMappingURL=utils.js.map