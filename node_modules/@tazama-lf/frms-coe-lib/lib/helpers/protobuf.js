"use strict";
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeLogBuffer = exports.decodeConditionsBuffer = exports.decodeCacheConditionsBuffer = exports.decodeSimpleConditionsBuffer = exports.createSimpleConditionsBuffer = exports.createCacheConditionsBuffer = exports.createConditionsBuffer = exports.createLogBuffer = exports.createMessageBuffer = void 0;
const tslib_1 = require("tslib");
const protobufjs_1 = tslib_1.__importDefault(require("protobufjs"));
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const root = protobufjs_1.default.loadSync(node_path_1.default.join(__dirname, '/proto/Full.proto'));
const FRMSMessage = root.lookupType('FRMSMessage');
const log = protobufjs_1.default.loadSync(node_path_1.default.join(__dirname, '/proto/Lumberjack.proto'));
const LogMessage = log.lookupType('LogMessage');
const conditions = protobufjs_1.default.loadSync(node_path_1.default.join(__dirname, '/proto/EFRuP.proto'));
const ConditionsMessage = conditions.lookupType('Conditions');
const CacheConditionsMessage = conditions.lookupType('CacheConditions');
const CacheSimpleConditionsMessage = conditions.lookupType('SimpleConditions');
/**
 * Create a Message `Buffer` derived from a byte array resulting from the input type
 *
 * @param {Record<string, unknown>} data The object to serialise to a `Buffer`
 * @returns {Buffer | undefined} The resulting `Buffer`, or `undefined` if an error occurred
 */
const createMessageBuffer = (data) => {
    try {
        const msg = FRMSMessage.create(data);
        const enc = FRMSMessage.encode(msg).finish();
        return enc;
    }
    catch (error) {
        return undefined;
    }
};
exports.createMessageBuffer = createMessageBuffer;
/**
 * Create a Log `Buffer` derived from a byte array resulting from the input type
 *
 * @param {Record<string, unknown>} data The object to serialise to a `Buffer`
 * @returns {Buffer | undefined} The resulting `Buffer`, or `undefined` if an error occurred
 */
const createLogBuffer = (data) => {
    try {
        const msg = LogMessage.create(data);
        const enc = LogMessage.encode(msg).finish();
        return enc;
    }
    catch (error) {
        return undefined;
    }
};
exports.createLogBuffer = createLogBuffer;
/**
 * Create a  AccountConditionResponse | EntityConditionResponse `Buffer` derived from a byte array resulting from the input type
 *
 * @param { AccountConditionResponse | EntityConditionResponse} data The object to serialise to a `Buffer`
 * @returns {Buffer | undefined} The resulting `Buffer`, or `undefined` if an error occurred
 */
const createConditionsBuffer = (data) => {
    try {
        const msg = ConditionsMessage.create(data);
        const enc = ConditionsMessage.encode(msg).finish();
        return enc;
    }
    catch (error) {
        return undefined;
    }
};
exports.createConditionsBuffer = createConditionsBuffer;
/**
 * Create a  Cache `Buffer` for conditions derived from a byte array resulting from the input type
 *
 * @param data The object to serialise to a `Buffer`
 * @returns {Buffer | undefined} The resulting `Buffer`, or `undefined` if an error occurred
 */
const createCacheConditionsBuffer = (data) => {
    try {
        const msg = CacheConditionsMessage.create(data);
        const enc = CacheConditionsMessage.encode(msg).finish();
        return enc;
    }
    catch (error) {
        return undefined;
    }
};
exports.createCacheConditionsBuffer = createCacheConditionsBuffer;
/**
 * Create a  Cache `Buffer` for conditions derived from a byte array resulting from the input type
 *
 * @param conditions A list of conditions to serialise to a `Buffer`
 * @returns {Buffer | undefined} The resulting `Buffer`, or `undefined` if an error occurred
 */
const createSimpleConditionsBuffer = (conditions) => {
    const data = { conditions };
    try {
        const msg = CacheSimpleConditionsMessage.create(data);
        const enc = CacheSimpleConditionsMessage.encode(msg).finish();
        return enc;
    }
    catch (error) {
        return undefined;
    }
};
exports.createSimpleConditionsBuffer = createSimpleConditionsBuffer;
/**
 * Decodes a `Buffer` derived from a byte array resulting from the input type
 *
 * @param {Buffer} buffer The byte array to decode to a `AccountConditionResponse and EntityConditionResponse`
 * @returns (AccountCondition|EntityCondition)[]
 */
const decodeSimpleConditionsBuffer = (buffer) => {
    const decodedMessage = CacheSimpleConditionsMessage.decode(buffer);
    const payload = CacheSimpleConditionsMessage.toObject(decodedMessage);
    return payload.conditions;
};
exports.decodeSimpleConditionsBuffer = decodeSimpleConditionsBuffer;
/**
 * Decodes a  AccountConditionResponse | EntityConditionResponse `Buffer` derived from a byte array resulting from the input type
 *
 * @param {Buffer} buffer The byte array to decode to a `AccountConditionResponse and EntityConditionResponse`
 * @returns { AccountConditionResponse | EntityConditionResponse | undefined} The resulting ` AccountConditionResponse | EntityConditionResponse`, or `undefined` if an error occurred
 */
const decodeCacheConditionsBuffer = (buffer) => {
    const decodedMessage = CacheConditionsMessage.decode(buffer);
    return CacheConditionsMessage.toObject(decodedMessage);
};
exports.decodeCacheConditionsBuffer = decodeCacheConditionsBuffer;
/**
 * Decodes a  AccountConditionResponse | EntityConditionResponse `Buffer` derived from a byte array resulting from the input type
 *
 * @param {Buffer} buffer The byte array to decode to a `AccountConditionResponse | EntityConditionResponse`
 * @returns { AccountConditionResponse | EntityConditionResponse | undefined} The resulting ` AccountConditionResponse | EntityConditionResponse`, or `undefined` if an error occurred
 */
const decodeConditionsBuffer = (buffer) => {
    const decodedMessage = ConditionsMessage.decode(buffer);
    return ConditionsMessage.toObject(decodedMessage);
};
exports.decodeConditionsBuffer = decodeConditionsBuffer;
/**
 * Decodes a Log `Buffer` derived from a byte array resulting in a concrete `LogMessage` type
 *
 * @param {Buffer} buffer The byte array to decode to a `LogMessage`
 * @returns {LogMessage | undefined} The resulting `LogMessage`, or `undefined` if an error occurred
 */
const decodeLogBuffer = (buffer) => {
    const decodedMessage = LogMessage.decode(buffer);
    return LogMessage.toObject(decodedMessage);
};
exports.decodeLogBuffer = decodeLogBuffer;
exports.default = FRMSMessage;
//# sourceMappingURL=protobuf.js.map