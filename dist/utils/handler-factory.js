"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandlerFactory = void 0;
const health_handler_1 = require("../handlers/health.handler");
const document_handler_1 = require("../handlers/document.handler");
const search_handler_1 = require("../handlers/search.handler");
class HandlerFactory {
    static healthHandler;
    static documentHandler;
    static searchHandler;
    static initialize(serviceClient, config) {
        this.healthHandler = new health_handler_1.HealthHandler(serviceClient, config);
        this.documentHandler = new document_handler_1.DocumentHandler(serviceClient);
        this.searchHandler = new search_handler_1.SearchHandler(serviceClient);
    }
    static getHealthHandler() {
        if (!this.healthHandler) {
            throw new Error('Handlers not initialized. Call HandlerFactory.initialize() first.');
        }
        return this.healthHandler;
    }
    static getDocumentHandler() {
        if (!this.documentHandler) {
            throw new Error('Handlers not initialized. Call HandlerFactory.initialize() first.');
        }
        return this.documentHandler;
    }
    static getSearchHandler() {
        if (!this.searchHandler) {
            throw new Error('Handlers not initialized. Call HandlerFactory.initialize() first.');
        }
        return this.searchHandler;
    }
}
exports.HandlerFactory = HandlerFactory;
//# sourceMappingURL=handler-factory.js.map