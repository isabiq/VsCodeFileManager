import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { DirContentDescription, ElementContentInfo, ServerMessage } from "../types/ServerMessage";
import { ElementInfo, ElementType } from "../types/ElementInfo";
import * as os from 'os';
import { ClientElementInfoMessage, ClientGoToDirMessage, ClientInitDirMessage, ClientOpenFileMessage, ClientResolveSymlinkType } from "../types/ClientMessage";
import { instanceStateStorage } from "./extentionInstanceState";
import { LVL_UP_DIR } from "../constants";
import { Server } from "../vscode-api/server/Server";
import { uris } from "../constants";
import { config } from "../config";

const ADDITIONAL_LINKS_FILE_PATH = "";

export function activate(context: vscode.ExtensionContext) {
	const extensionUri = context.extensionUri;

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'FileManager.hello',
			async () => {
				vscode.window.showInformationMessage('Hello world!');
			}
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'FileManager.openFileManager',
			() => {
				// Create webview
				const manager = vscode.window.createWebviewPanel(
					'fileManagerWindow',
					'File Manager',
					vscode.ViewColumn.One,
					{
						enableScripts: true,
					}
				);

				// Fill instance storage
				const server = new Server(manager, context);
				instanceStateStorage.set(manager, {
					server: server,
					currentDirectory: vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : os.homedir(),
				});

				// Initialize methods of webview
				manager.onDidDispose(() => {
					instanceStateStorage.delete(manager);
				}, null, context.subscriptions);

				// Helper functions
				const getUpdateCurrentDirectoryMessage = (): DirContentDescription => {
					const state = instanceStateStorage.get(manager);
					return {
						currentDir: state.currentDirectory,
						elementsList: getElementsList(state.currentDirectory),
						prevDir: state.prevDir,
					};
				};

				// Initialize server handlers
				server.addHandler(uris.goToDir, "POST", (data: ClientGoToDirMessage): DirContentDescription => {
					instanceStateStorage.set(manager, {
						...instanceStateStorage.get(manager),
						currentDirectory: fs.realpathSync(path.join(data.currentDir, data.dirName)),
						prevDir: data.dirName === LVL_UP_DIR ? path.basename(instanceStateStorage.get(manager).currentDirectory) : undefined,
					});
					console.log(1, instanceStateStorage)
					return getUpdateCurrentDirectoryMessage();
				});
				server.addHandler(uris.goToDirAbs, "POST", (path: string): DirContentDescription => {
					instanceStateStorage.set(manager, {
						...instanceStateStorage.get(manager),
						currentDirectory: path,
						prevDir: undefined,
					});
					console.log(2, instanceStateStorage)
					return getUpdateCurrentDirectoryMessage();
				});
				server.addHandler(uris.getDirInfo, "GET", (data: ClientGoToDirMessage) => {
					if (data.dirName === LVL_UP_DIR) {
						return [];
					}
					const destPath = fs.realpathSync(path.join(data.currentDir, data.dirName));
					const response: DirContentDescription = {
						currentDir: destPath,
						elementsList: getElementType(destPath) === "Directory" ? getElementsList(destPath) : [],
					};
					console.log(3, instanceStateStorage)
					return response;
				});
				server.addHandler(uris.elementInfo, "GET", (data: ClientElementInfoMessage): ElementContentInfo => {
					const pathToElement = fs.realpathSync(path.join(data.currentDir, data.elementName));

					console.log(4, instanceStateStorage)
					if (data.elementName === LVL_UP_DIR) {
						return {
							type: "Directory",
							content: {
								elementsList: [],
							}
						};
					} else if (fs.lstatSync(pathToElement).isFile()) {
						try {
							const maxSize = vscode.workspace.getConfiguration().get<number>('fileManager.maxSize');
							const maxCharacters = vscode.workspace.getConfiguration().get<number>('fileManager.maxCharacters');
							const exclude = vscode.workspace.getConfiguration().get<string[]>('fileManager.excludeExtensions')
							const stats = fs.statSync(pathToElement)
							const fileSizeInBytes = stats.size;
							const ext = path.extname(pathToElement)
							if (exclude?.includes(ext) || (!!maxSize && maxSize < fileSizeInBytes)) {
								return {
									type: "File",
									content: {
										data: "", metaData: {
											size: fileSizeInBytes
										}
									}
								};
							}
							return {
								type: "File",
								content: {
									data: fs.readFileSync(pathToElement).subarray(0, maxCharacters).toString(),
									metaData: {
										size: fileSizeInBytes
									}
								}
							};

						} catch (error) {
							console.error('Error while reading file', error);
							return {
								type: "File",
								content: {
									data: ""
								}
							};
						}
					} else if (fs.lstatSync(pathToElement).isDirectory()) {
						return {
							type: "Directory",
							content: {
								elementsList: getElementsList(pathToElement),
							}
						};
					} else {
						console.warn(`Unimplemented behavoiur for file type of address ${pathToElement}`);
						return {
							type: "File",
							content: {
								data: "",
							}
						};
					}
				});
				server.addHandler(uris.initDir, "GET", (data: ClientInitDirMessage): DirContentDescription => {
					console.log(5, instanceStateStorage)
					return getUpdateCurrentDirectoryMessage();
				});
				server.addHandler(uris.openFile, "POST", (data: ClientOpenFileMessage): null => {
					const filePath = path.join(data.currentDir, data.fileName);
					vscode.commands.executeCommand('vscode.open', vscode.Uri.file(filePath));
					instanceStateStorage.get(manager).prevDir = data.fileName;
					console.log(6, instanceStateStorage)
					return null;
				});
				server.addHandler(uris.resolveSymlinkType, "GET", (data: ClientResolveSymlinkType): ElementType => {
					const filePath = fs.realpathSync(path.join(data.currentDir, data.fileName));
					console.log(7, instanceStateStorage)
					if (fs.lstatSync(filePath).isDirectory()) {
						return "Directory";
					}
					if (fs.lstatSync(filePath).isFile()) {
						return "File";
					}
					return "Unknown";
				});

				// Load html content
				const indexJsPath = manager.webview.asWebviewUri(
					vscode.Uri.joinPath(extensionUri, 'out', 'index.js')
				);
				const indexCssPath = manager.webview.asWebviewUri(
					vscode.Uri.joinPath(extensionUri, 'css', 'index.css')
				);
				const iconsCssPath = manager.webview.asWebviewUri(
					vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css')
				);
				const htmlContent = getWebViewContent(indexJsPath, indexCssPath, iconsCssPath);
				manager.webview.html = htmlContent;
			}
		)
	);
}

export function deactivate() { }

function getWebViewContent(indexJsPath: vscode.Uri, indexCssPath: vscode.Uri, iconsCssPath: vscode.Uri) {
	return `
	<html>
		<head>
			<title>File Manager</title>
			<link rel="stylesheet" href="${indexCssPath}">
			<link rel="stylesheet" href="${iconsCssPath}">
		</head>
		<body>
			<div class="content" id="root"></div>

			<script type="module" src="${indexJsPath}"></script>
		</body>
	</html>`;
}

function getElementType(pathToElement: string): ElementType {
	const stats = fs.lstatSync(pathToElement);
	if (stats.isDirectory()) {
		return "Directory";
	}
	if (stats.isFile()) {
		return "File";
	}
	if (stats.isSymbolicLink()) {
		return "Symlink";
	}
	console.warn(`Unknown type of element ${pathToElement}`);

	return "Unknown";
}

function getElementsList(pathToDir: string) {
	return ((pathToDir === "/" ? [] : ['..']).concat(fs.readdirSync(pathToDir))).map((elementName, index): ElementInfo => ({
		name: elementName,
		type: getElementType(path.join(pathToDir, elementName)),
		temp: ''
	}));
}
