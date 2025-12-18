import type { ConfigurationDB, DBConfig, LocalCacheConfig } from '../services/dbManager';
export declare function configurationBuilder(manager: ConfigurationDB, configurationConfig: DBConfig, cacheConfig?: LocalCacheConfig): Promise<void>;
