import * as vscode from "vscode";
import { InstanceState } from "./types/InstanceState";

export const instanceStateStorage = new Map<vscode.WebviewPanel, InstanceState>();