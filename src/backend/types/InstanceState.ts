import { Server } from "../../vscode-api/server/Server";

export interface InstanceState {
    server: Server;
    currentDirectory: string;
    prevDir?: string;
};
