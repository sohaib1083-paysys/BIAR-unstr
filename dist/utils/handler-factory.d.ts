import { ServiceClient } from '../services';
import { Config } from '../schemas';
import { HealthHandler } from '../handlers/health.handler';
import { DocumentHandler } from '../handlers/document.handler';
import { SearchHandler } from '../handlers/search.handler';
export declare class HandlerFactory {
    private static healthHandler;
    private static documentHandler;
    private static searchHandler;
    static initialize(serviceClient: ServiceClient, config: Config): void;
    static getHealthHandler(): HealthHandler;
    static getDocumentHandler(): DocumentHandler;
    static getSearchHandler(): SearchHandler;
}
//# sourceMappingURL=handler-factory.d.ts.map