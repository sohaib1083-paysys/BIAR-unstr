"use strict";
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const tslib_1 = require("tslib");
const ioredis_1 = tslib_1.__importDefault(require("ioredis"));
const protobuf_1 = tslib_1.__importDefault(require("../helpers/protobuf"));
const node_events_1 = require("node:events");
const MAX_RETRIES = 10;
const RECONNECT_DELAY_MS = 500;
class RedisService {
    _redisClient;
    constructor(config) {
        if (config.isCluster) {
            this._redisClient = new ioredis_1.default.Cluster(config.servers, {
                scaleReads: 'all',
                redisOptions: {
                    db: config.db,
                    password: config.password,
                    enableAutoPipelining: true,
                },
                clusterRetryStrategy(times) {
                    if (times >= MAX_RETRIES) {
                        return null;
                    }
                    return RECONNECT_DELAY_MS;
                },
            });
        }
        else {
            this._redisClient = new ioredis_1.default({
                db: config.db,
                host: config.servers[0].host,
                port: config.servers[0].port,
                password: config.password,
                retryStrategy(times) {
                    if (times >= MAX_RETRIES) {
                        return null;
                    }
                    return RECONNECT_DELAY_MS;
                },
            });
        }
    }
    async init() {
        try {
            await (0, node_events_1.once)(this._redisClient, 'connect');
            return '✅ Redis connection is ready';
        }
        catch (err) {
            throw new Error(`❌ Redis connection could not be established\n${JSON.stringify(err)}`);
        }
        finally {
            this._redisClient.on('end', () => {
                throw new Error('❓ Redis connection lost, no more reconnections will be made');
            });
        }
    }
    /**
     * Create an instance of a ready to use RedisService
     *
     * @param {RedisConfig} config The required config to start a connection to Redis
     * @return {Promise<RedisService>} A Promise that resolves to a RedisService instance.
     */
    static async create(config) {
        const redisInstance = new RedisService(config);
        await redisInstance.init();
        return redisInstance;
    }
    /**
     * Get the value stored as JSON for the given key from Redis.
     *
     * @param {string} key The key associated with the JSON value to retrieve.
     * @returns {Promise<string>} A Promise that resolves to the JSON value as a string.
     */
    async getJson(key) {
        try {
            const res = await this._redisClient.get(key);
            if (res === null) {
                return '';
            }
            return res;
        }
        catch (err) {
            throw new Error(`Error while getting ${key} from Redis`);
        }
    }
    async getBuffer(key) {
        try {
            const res = await this._redisClient.getBuffer(key);
            if (res === null) {
                return {};
            }
            const decodedReport = protobuf_1.default.decode(res);
            return protobuf_1.default.toObject(decodedReport);
        }
        catch (err) {
            throw new Error(`Error while getting ${key} from Redis`);
        }
    }
    /**
     * Get the members of a Redis set stored under the given key.
     *
     * @param {string} key The key associated with the Redis set.
     * @returns {Promise<Record<string, unknown>[]>} A Promise that resolves to an array of set members as objects.
     */
    async getMemberValues(key) {
        try {
            const res = (await this._redisClient.smembersBuffer(key));
            const membersBuffer = res.map((member) => {
                const decodedMember = protobuf_1.default.decode(member);
                return protobuf_1.default.toObject(decodedMember);
            });
            if (!res || membersBuffer.length === 0) {
                return [];
            }
            return membersBuffer;
        }
        catch (err) {
            throw new Error(`Error while getting members on ${key} from Redis`);
        }
    }
    /**
     * Delete the entry associated with the given key from Redis.
     *
     * @param {string} key The key to be deleted from Redis.
     * @returns {Promise<void>} A Promise that resolves when the key is successfully deleted.
     */
    async deleteKey(key) {
        try {
            await this._redisClient.del(key);
        }
        catch (err) {
            throw new Error(`Error while deleting ${key} from Redis`);
        }
    }
    /**
     * Store a JSON value in Redis under the given key with an optional expiration time.
     *
     * @param {string} key The key to associate with the JSON value in Redis.
     * @param {string} value The JSON value to store in Redis.
     * @param {number} expire The expiration time for the key (in seconds). Use 0 for no expiration.
     * @returns {Promise<void>} A Promise that resolves when the JSON value is successfully stored in Redis.
     */
    async setJson(key, value, expire) {
        const res = await this._redisClient.set(key, value, 'EX', expire);
        if (res !== 'OK') {
            throw new Error('Error while setting key in redis');
        }
    }
    /**
     * Store a value in Redis under the given key with an optional expiration time.
     *
     * Much like `setJson()`, but without the JSON restriction,
     * This version accepts `Buffer` and `number` times in addition
     */
    async set(key, value, expire) {
        let res;
        if (expire) {
            res = await this._redisClient.set(key, value, 'EX', expire);
        }
        else {
            res = await this._redisClient.set(key, value);
        }
        if (res !== 'OK') {
            throw new Error('Error while setting key in redis');
        }
    }
    /**
     * Add a value to a Redis set under the given key.
     *
     * @param {string} key The key associated with the Redis set.
     * @param {RedisData} value The value to add to the Redis set.
     * @returns {Promise<void>} A Promise that resolves when the value is successfully added to the set.
     */
    async setAdd(key, value) {
        const valueMessage = protobuf_1.default.create(value);
        const valueBuffer = protobuf_1.default.encode(valueMessage).finish();
        const res = await this._redisClient.sadd(key, valueBuffer);
        if (res === 0) {
            throw new Error(`Member already exists for key ${key}`);
        }
    }
    /**
     * Add a value to a Redis set and then return all members from that set.
     *
     * @param {string} key The key associated with the Redis set.
     * @param {Record<string, unknown>} value The value to add to the Redis set.
     * @returns {Promise<string[]>} A Promise that resolves to an array of set members as strings.
     */
    async addOneGetAll(key, value) {
        try {
            const valueMessage = protobuf_1.default.create(value);
            const valueBuffer = protobuf_1.default.encode(valueMessage).finish();
            const res = await this._redisClient.multi().sadd(key, valueBuffer).smembersBuffer(key).exec();
            const result = res ? res[1][1] : undefined;
            const membersBuffer = result?.map((member) => {
                const decodedMember = protobuf_1.default.decode(member);
                return protobuf_1.default.toObject(decodedMember);
            });
            if (!res || membersBuffer?.length === 0) {
                return [];
            }
            return membersBuffer;
        }
        catch (err) {
            throw new Error(`Error while getting members on ${key} from Redis`);
        }
    }
    /**
     * Add a value to a Redis set and then return number of members in the set after the addition.
     *
     * @param {string} key The key associated with the Redis set.
     * @param {Record<string, unknown>} value The value to add to the Redis set.
     * @returns {Promise<string[]>} A Promise that resolves to an array of set members as strings.
     */
    async addOneGetCount(key, value) {
        const valueMessage = protobuf_1.default.create(value);
        const valueBuffer = protobuf_1.default.encode(valueMessage).finish();
        const res = await this._redisClient.multi().sadd(key, valueBuffer).scard(key).exec();
        if (res?.[1]?.[1]) {
            return res[1][1];
        }
        else {
            throw new Error('addOneGetAll failed to return properly');
        }
    }
    /**
     * Close the Redis connection and release associated resources.
     */
    quit() {
        this._redisClient.quit();
    }
}
exports.RedisService = RedisService;
//# sourceMappingURL=redis.js.map