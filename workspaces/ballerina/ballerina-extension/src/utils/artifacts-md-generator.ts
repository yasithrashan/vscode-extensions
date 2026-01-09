/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as path from 'path';
import * as fs from 'fs';
import {
    ARTIFACT_TYPE,
    Artifacts,
    ArtifactsNotification,
    BaseArtifact,
    DIRECTORY_MAP
} from "@wso2/ballerina-core";
import { ExtendedLangClient } from "../core/extended-language-client";

/**
 * Interface for the file-grouped artifacts
 */
interface FileArtifacts {
    fileName: string;
    filePath: string;
    configurations: BaseArtifact[];
    types: BaseArtifact[];
    variables: BaseArtifact[];
    functions: BaseArtifact[];
    listeners: BaseArtifact[];
    entryPoints: BaseArtifact[];
    connections: BaseArtifact[];
    dataMappers: BaseArtifact[];
    naturalFunctions: BaseArtifact[];
}

/**
 * Generate bal.md from project artifacts
 */
export async function generateArtifactsMarkdown(
    projectPath: string,
    langClient: ExtendedLangClient
): Promise<void> {
    try {
        const projectArtifacts = await langClient.getProjectArtifacts({ projectPath });

        if (!projectArtifacts || !projectArtifacts.artifacts) {
            console.warn("No artifacts found for project:", projectPath);
            return;
        }

        const artifactsNotification: ArtifactsNotification = {
            uri: projectPath,
            artifacts: projectArtifacts.artifacts
        };

        const markdown = generateMarkdownFromArtifacts(artifactsNotification);
        const outputPath = path.join(projectPath, 'bal.md');

        fs.writeFileSync(outputPath, markdown, 'utf8');
        console.log(`Code map generated at: ${outputPath}`);
    } catch (error) {
        console.error("Error generating artifacts markdown:", error);
        throw error;
    }
}

/**
 * Generate markdown content from artifacts
 */
export function generateMarkdownFromArtifacts(
    artifactsNotification: ArtifactsNotification
): string {
    const projectPath = artifactsNotification.uri;
    const artifacts = artifactsNotification.artifacts;

    const fileArtifactsMap = groupArtifactsByFile(artifacts, projectPath);

    let markdown = `# Code Structure Overview\n\n`;
    markdown += `Comprehensive overview of project structure, artifacts, and code organization across all source files.\n\n`;
    markdown += `*Project Path:* ${projectPath}\n\n`;
    markdown += `---\n\n`;

    const sortedFiles = Array.from(fileArtifactsMap.values()).sort((a, b) =>
        a.fileName.localeCompare(b.fileName)
    );

    for (const fileArtifact of sortedFiles) {
        markdown += generateFileMarkdown(fileArtifact, projectPath);
    }

    return markdown;
}

/**
 * Group artifacts by file
 */
function groupArtifactsByFile(
    artifacts: Artifacts,
    projectPath: string
): Map<string, FileArtifacts> {
    const fileMap = new Map<string, FileArtifacts>();

    const addToFileMap = (
        artifact: BaseArtifact,
        category: keyof Omit<FileArtifacts, 'fileName' | 'filePath'>
    ) => {
        const fileName = artifact.location.fileName;
        const filePath = path.join(projectPath, fileName);

        if (!fileMap.has(fileName)) {
            fileMap.set(fileName, {
                fileName,
                filePath,
                configurations: [],
                types: [],
                variables: [],
                functions: [],
                listeners: [],
                entryPoints: [],
                connections: [],
                dataMappers: [],
                naturalFunctions: []
            });
        }

        fileMap.get(fileName)![category].push(artifact);
    };

    if (artifacts[ARTIFACT_TYPE.Configurations]) {
        Object.values(artifacts[ARTIFACT_TYPE.Configurations])
            .forEach(a => addToFileMap(a as BaseArtifact, 'configurations'));
    }

    if (artifacts[ARTIFACT_TYPE.Types]) {
        Object.values(artifacts[ARTIFACT_TYPE.Types])
            .forEach(a => addToFileMap(a as BaseArtifact, 'types'));
    }

    if (artifacts[ARTIFACT_TYPE.Variables]) {
        Object.values(artifacts[ARTIFACT_TYPE.Variables])
            .forEach(a => addToFileMap(a as BaseArtifact, 'variables'));
    }

    if (artifacts[ARTIFACT_TYPE.Functions]) {
        Object.values(artifacts[ARTIFACT_TYPE.Functions])
            .forEach(a => addToFileMap(a as BaseArtifact, 'functions'));
    }

    if (artifacts[ARTIFACT_TYPE.Listeners]) {
        Object.values(artifacts[ARTIFACT_TYPE.Listeners])
            .forEach(a => addToFileMap(a as BaseArtifact, 'listeners'));
    }

    if (artifacts[ARTIFACT_TYPE.EntryPoints]) {
        Object.values(artifacts[ARTIFACT_TYPE.EntryPoints])
            .forEach(a => addToFileMap(a as BaseArtifact, 'entryPoints'));
    }

    if (artifacts[ARTIFACT_TYPE.Connections]) {
        Object.values(artifacts[ARTIFACT_TYPE.Connections])
            .forEach(a => addToFileMap(a as BaseArtifact, 'connections'));
    }

    if (artifacts[ARTIFACT_TYPE.DataMappers]) {
        Object.values(artifacts[ARTIFACT_TYPE.DataMappers])
            .forEach(a => addToFileMap(a as BaseArtifact, 'dataMappers'));
    }

    if (artifacts[ARTIFACT_TYPE.NaturalFunctions]) {
        Object.values(artifacts[ARTIFACT_TYPE.NaturalFunctions])
            .forEach(a => addToFileMap(a as BaseArtifact, 'naturalFunctions'));
    }

    return fileMap;
}

/**
 * Generate markdown for a single file
 */
function generateFileMarkdown(
    fileArtifact: FileArtifacts,
    projectPath: string
): string {
    const fileName = path.basename(fileArtifact.filePath);
    const relativePath = path.relative(process.cwd(), fileArtifact.filePath);
    let markdown = `## File: ${fileName}\n_Path:_ \`${relativePath}\`\n\n`;

    const renderList = (title: string, items: BaseArtifact[], suffix = '') => {
        if (items.length === 0) return '';
        let block = `### ${title}\n\n`;
        items
            .sort((a, b) => a.location.startLine.line - b.location.startLine.line)
            .forEach(a => {
                block += `- **${a.name}${suffix}** (lines ${a.location.startLine.line}-${a.location.endLine.line})\n`;
            });
        return block + `\n`;
    };

    markdown += renderList('Configurations', fileArtifact.configurations);
    markdown += renderList('Types', fileArtifact.types);
    markdown += renderList('Variables', fileArtifact.variables);
    markdown += renderList('Functions', fileArtifact.functions, '()');
    markdown += renderList('Natural Functions', fileArtifact.naturalFunctions, '()');
    markdown += renderList('Data Mappers', fileArtifact.dataMappers);
    markdown += renderList('Listeners', fileArtifact.listeners);
    markdown += renderList('Connections', fileArtifact.connections);

    if (fileArtifact.entryPoints.length > 0) {
        markdown += `### Entry Points\n\n`;
        fileArtifact.entryPoints
            .sort((a, b) => a.location.startLine.line - b.location.startLine.line)
            .forEach(a => markdown += generateEntryPointMarkdown(a));
    }

    return markdown + `---\n\n`;
}

/**
 * Entry point markdown
 */
function generateEntryPointMarkdown(artifact: BaseArtifact): string {
    let markdown = '';

    if (artifact.type === DIRECTORY_MAP.SERVICE) {
        markdown += `#### ${artifact.name} (lines ${artifact.location.startLine.line}-${artifact.location.endLine.line})\n\n`;

        if (artifact.module) {
            markdown += `**Module:** ${artifact.module}\n\n`;
        }

        if (artifact.children && Object.keys(artifact.children).length > 0) {
            markdown += `**Resources:**\n\n`;

            // Extract service base path from artifact name (e.g., "HTTP Service - /api/v1/orders")
            const servicePathMatch = artifact.name.match(/- (.+)$/);
            const basePath = servicePathMatch ? servicePathMatch[1] : '';

            Object.values(artifact.children)
                .sort((a, b) => a.location.startLine.line - b.location.startLine.line)
                .forEach(r => {
                    const method = (r.accessor ?? '').toUpperCase();
                    const resourcePath = r.name;

                    // Convert resource path to URL format (e.g., "[string orderId]" -> "{orderId}")
                    let formattedPath = resourcePath.replace(/\[string\s+(\w+)\]/g, '{$1}');

                    // Build full path
                    const fullPath = formattedPath === '.' ? basePath : `${basePath}/${formattedPath}`;

                    markdown += `- **${method} ${fullPath}**  \n`;
                    markdown += `  _raw:_ \`${resourcePath}\`\n\n`;
                });
        }

        markdown += `\n`;
    }

    if (artifact.type === DIRECTORY_MAP.AUTOMATION) {
        markdown += `#### Automation (lines ${artifact.location.startLine.line}-${artifact.location.endLine.line})\n\n`;
        if (artifact.module) {
            markdown += `**Module:** ${artifact.module}\n\n`;
        }
    }

    return markdown;
}

/**
 * Save markdown utility
 */
export function saveMarkdownToFile(
    artifactsNotification: ArtifactsNotification,
    outputPath?: string
): { markdown: string; filePath: string } {
    const markdown = generateMarkdownFromArtifacts(artifactsNotification);
    const filePath = outputPath || path.join(artifactsNotification.uri, 'bal.md');

    fs.writeFileSync(filePath, markdown, 'utf8');
    return { markdown, filePath };
}

