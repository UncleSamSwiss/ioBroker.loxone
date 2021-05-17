// This file extends the AdapterConfig type from "@types/iobroker"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
    namespace ioBroker {
        interface AdapterConfig {
            host: string;
            port: number;
            username: string;
            password: string;
            syncNames: boolean;
            syncRooms: boolean;
            syncFunctions: boolean;

            /** if not set, it implies "all" */
            weatherServer?: 'off' | 'current' | '1day' | 'all';
        }
    }
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
