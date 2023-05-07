export type ElementType = "File" | "Directory" | "Symlink" | "Unknown";

export interface ElementInfo {
    name: string;
    temp:string;
    type: ElementType;
};
