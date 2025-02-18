import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Interface for parsed comment data
interface ParsedEndpoint {
    method: string;
    path: string;
    summary: string;
    description?: string;
    request?: any;
    responses?: {
        [key: string]: any;
    };
}

// OpenAPI structure
interface OpenAPISpec {
    openapi: string;
    info: {
        title: string;
        version: string;
    };
    paths: {
        [key: string]: {
            [key: string]: {
                summary?: string;
                description?: string;
                requestBody?: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object';
                                example: any;
                            };
                        };
                    };
                };
                responses: {
                    [key: string]: {
                        description: string;
                        content?: {
                            'application/json': {
                                schema: {
                                    type: 'object';
                                    example: any;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
}

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('api-doc-gen.generateDocs', async () => {
        await generateOpenApiDocs();
    });

    context.subscriptions.push(disposable);

    // Set up a file watcher
    const supportedExtensions = ['.ts', '.js', '.cpp', '.hpp', '.h', '.c'];
    const fileWatcher = vscode.workspace.createFileSystemWatcher(
        `**/*{${supportedExtensions.join(',')}}`
    );

    fileWatcher.onDidChange(async (uri) => {
        vscode.window.showInformationMessage(`File changed: ${uri.fsPath}`);
        await generateOpenApiDocs();
    });

    fileWatcher.onDidCreate(async (uri) => {
        vscode.window.showInformationMessage(`File created: ${uri.fsPath}`);
        await generateOpenApiDocs();
    });

    fileWatcher.onDidDelete(async (uri) => {
        vscode.window.showInformationMessage(`File deleted: ${uri.fsPath}`);
        await generateOpenApiDocs();
    });

    context.subscriptions.push(fileWatcher);
}

async function generateOpenApiDocs() {
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        const supportedExtensions = ['.ts', '.js', '.cpp', '.hpp', '.h', '.c'];
        let allEndpoints: ParsedEndpoint[] = [];

        // Find all supported files in the workspace
        for (const folder of workspaceFolders) {
            const files = await vscode.workspace.findFiles(
                `**/*{${supportedExtensions.join(',')}}`,
                '**/node_modules/**'
            );

            // Process each file
            for (const file of files) {
                const document = await vscode.workspace.openTextDocument(file);
                const text = document.getText();
                const endpoints = parseComments(text);
                allEndpoints = [...allEndpoints, ...endpoints];
            }
        }

        // Generate/update OpenAPI spec
        const openApiSpec = await updateOpenAPISpec(allEndpoints);

        // Save the OpenAPI spec
        const openApiPath = path.join(workspaceFolders[0].uri.fsPath, 'docs', 'openapi.json');

        // Create docs directory if it doesn't exist
        const docsDir = path.dirname(openApiPath);
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir, { recursive: true });
        }

        fs.writeFileSync(openApiPath, JSON.stringify(openApiSpec, null, 2));
        vscode.window.showInformationMessage('API documentation generated successfully in docs/openapi.json!');
    } catch (error) {
        vscode.window.showErrorMessage(`Error generating API documentation: ${error}`);
    }
}

function parseComments(text: string): ParsedEndpoint[] {
    const endpoints: ParsedEndpoint[] = [];

    // Match both C++ style comments (// and /* */) and JS/TS style comments
    const commentRegex = /\/\*\*?([\s\S]*?)\*\/|\/\/(.*)/g;
    // Updated endpoint regex to only capture until the end of the line
    const endpointRegex = /@endpoint\s+(\w+)\s+([^\s]+)\s+([^\n\r@]+)/;
    const requestRegex = /@request\s+({[\s\S]*?})/;
    const responseRegex = /@response\s+(\d+)?\s*({[\s\S]*?})/;
    const descriptionRegex = /@description\s+([^\n\r@]+)/;

    let match;
    while ((match = commentRegex.exec(text)) !== null) {
        const comment = match[1] || match[2];
        if (!comment) continue;

        // Clean up the comment by removing asterisks and extra whitespace
        const cleanComment = comment
            .replace(/^\s*\*+/gm, '') // Remove leading asterisks
            .replace(/\r\n/g, '\n')   // Normalize line endings
            .trim();

        const endpointMatch = endpointRegex.exec(cleanComment);
        if (!endpointMatch) continue;

        const endpoint: ParsedEndpoint = {
            method: endpointMatch[1].toLowerCase(),
            path: endpointMatch[2],
            summary: endpointMatch[3].trim(),
            responses: {}
        };

        // Parse description
        const descriptionMatch = descriptionRegex.exec(cleanComment);
        if (descriptionMatch) {
            endpoint.description = descriptionMatch[1].trim();
        }

        // Parse request body
        const requestMatch = requestRegex.exec(cleanComment);
        if (requestMatch) {
            try {
                // Clean up the JSON string
                const jsonStr = requestMatch[1]
                    .replace(/\n\s*\*/g, '\n')  // Remove asterisks from multiline
                    .replace(/\s*\n\s*/g, '')   // Remove newlines and spaces
                    .trim();
                endpoint.request = JSON.parse(jsonStr);
            } catch (e) {
                console.error('Error parsing request JSON:', e);
            }
        }

        // Parse responses
        const responseMatches = [...cleanComment.matchAll(new RegExp(responseRegex, 'g'))];
        for (const responseMatch of responseMatches) {
            try {
                const statusCode = responseMatch[1] || '200';
                // Clean up the JSON string
                const jsonStr = responseMatch[2]
                    .replace(/\n\s*\*/g, '\n')  // Remove asterisks from multiline
                    .replace(/\s*\n\s*/g, '')   // Remove newlines and spaces
                    .trim();
                endpoint.responses![statusCode] = JSON.parse(jsonStr);
            } catch (e) {
                console.error('Error parsing response JSON:', e);
            }
        }

        endpoints.push(endpoint);
    }

    return endpoints;
}

async function updateOpenAPISpec(endpoints: ParsedEndpoint[]): Promise<OpenAPISpec> {
    let existingSpec: OpenAPISpec = {
        openapi: '3.0.0',
        info: {
            title: 'API Documentation',
            version: '1.0.0'
        },
        paths: {}
    };

    // Try to load existing OpenAPI spec
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        const openApiPath = path.join(workspaceFolder.uri.fsPath, 'openapi.json');
        if (fs.existsSync(openApiPath)) {
            try {
                existingSpec = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));
            } catch (e) {
                console.error('Error reading existing OpenAPI spec:', e);
            }
        }
    }

    // Update spec with new endpoints
    for (const endpoint of endpoints) {
        if (!existingSpec.paths[endpoint.path]) {
            existingSpec.paths[endpoint.path] = {};
        }

        existingSpec.paths[endpoint.path][endpoint.method] = {
            summary: endpoint.summary,
            description: endpoint.description,
            ...(endpoint.request && {
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                example: endpoint.request
                            }
                        }
                    }
                }
            }),
            responses: Object.entries(endpoint.responses || {}).reduce((acc, [status, response]) => ({
                ...acc,
                [status]: {
                    description: `${status} response`,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                example: response
                            }
                        }
                    }
                }
            }), {})
        };
    }

    return existingSpec;
}

export function deactivate() {}
