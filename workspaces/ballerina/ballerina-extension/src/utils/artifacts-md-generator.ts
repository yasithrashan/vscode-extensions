/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy at
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
 * Interface for file-grouped artifacts
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
            console.warn("generateArtifactsMarkdown: No artifacts found for project:", projectPath);
            return;
        }

        const artifactsNotification: ArtifactsNotification = {
            uri: projectPath,
            artifacts: projectArtifacts.artifacts
        };

        // Save projectArtifacts to JSON file
        const jsonOutputPath = path.join(projectPath, 'project-artifacts.json');
        fs.writeFileSync(jsonOutputPath, JSON.stringify(projectArtifacts, null, 2), 'utf8');
        console.log(`generateArtifactsMarkdown: Project artifacts saved to: ${jsonOutputPath}`);

        const markdown = generateMarkdownFromArtifacts(artifactsNotification);
        const outputPath = path.join(projectPath, 'bal.md');

        fs.writeFileSync(outputPath, markdown, 'utf8');
        console.log(`generateArtifactsMarkdown: Code map generated at: ${outputPath}`);
    } catch (error) {
        console.error("generateArtifactsMarkdown: Error generating artifacts markdown:", error);
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

    let markdown = `# Ballerina Project Code Map\n\n`;
    markdown += `> **Note:** This is an auto-generated file using the Ballerina Language Server. **Do not modify manually.**\n\n`;
    markdown += `*Project Path:* ${projectPath}\n\n`;
    markdown += `---\n\n`;

    const sortedFiles = Array.from(fileArtifactsMap.values()).sort((a, b) =>
        a.fileName.localeCompare(b.fileName)
    );

    for (const fileArtifact of sortedFiles) {
        markdown += generateFileMarkdown(fileArtifact);
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

    const artifactTypeToKey: Record<string, keyof Omit<FileArtifacts, 'fileName' | 'filePath'>> = {
        [ARTIFACT_TYPE.Configurations]: 'configurations',
        [ARTIFACT_TYPE.Types]: 'types',
        [ARTIFACT_TYPE.Variables]: 'variables',
        [ARTIFACT_TYPE.Functions]: 'functions',
        [ARTIFACT_TYPE.Listeners]: 'listeners',
        [ARTIFACT_TYPE.EntryPoints]: 'entryPoints',
        [ARTIFACT_TYPE.Connections]: 'connections',
        [ARTIFACT_TYPE.DataMappers]: 'dataMappers',
        [ARTIFACT_TYPE.NaturalFunctions]: 'naturalFunctions'
    };

    const addToFileMap = (
        artifact: BaseArtifact,
        category: keyof Omit<FileArtifacts, 'fileName' | 'filePath'>
    ) => {
        if (!artifact.location) return; // defensive
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

    for (const [artifactType, key] of Object.entries(artifactTypeToKey)) {
        if (artifacts[artifactType]) {
            Object.values(artifacts[artifactType]).forEach(a => addToFileMap(a as BaseArtifact, key));
        }
    }

    return fileMap;
}

/**
 * Sort artifacts by start line safely
 */
function sortArtifactsByStartLine(artifacts: BaseArtifact[]): BaseArtifact[] {
    return artifacts.slice().sort((a, b) => {
        const aLine = a.location?.startLine?.line ?? 0;
        const bLine = b.location?.startLine?.line ?? 0;
        return aLine - bLine;
    });
}

/**
 * Generate markdown for a single file
 */
function generateFileMarkdown(fileArtifact: FileArtifacts): string {
    const fileName = path.basename(fileArtifact.filePath);
    const relativePath = path.relative(process.cwd(), fileArtifact.filePath);
    let markdown = `## File: ${fileName}\n_Path:_ \`${relativePath}\`\n\n`;

    const renderList = (title: string, items: BaseArtifact[], suffix = '') => {
        if (items.length === 0) return '';
        let block = `### ${title}\n\n`;
        sortArtifactsByStartLine(items).forEach(a => {
            const start = a.location?.startLine?.line ?? '?';
            const end = a.location?.endLine?.line ?? '?';
            block += `- **${a.name}${suffix}** (lines ${start}-${end})\n`;
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
        sortArtifactsByStartLine(fileArtifact.entryPoints).forEach(a => markdown += generateEntryPointMarkdown(a));
    }

    return markdown + `---\n\n`;
}

/**
 * Normalize resource path to standard REST format
 */
function normalizeResourcePath(resourceName: string): string {
    return resourceName
        .replace(/\[string\s+(\w+)\]/g, '{$1}')
        .replace(/\[int\s+(\w+)\]/g, '{$1}')
        .replace(/\[(\w+)\s+(\w+)\]/g, '{$2}')
        .replace(/\\\-/g, '-'); // Handle escaped hyphens
}

/**
 * Entry point markdown
 */
function generateEntryPointMarkdown(artifact: BaseArtifact): string {
    let markdown = '';

    if (!artifact.location) return markdown;

    const start = artifact.location.startLine?.line ?? '?';
    const end = artifact.location.endLine?.line ?? '?';

    if (artifact.type === DIRECTORY_MAP.SERVICE) {
        markdown += `#### ${artifact.name} (lines ${start}-${end})\n`;
        if (artifact.module) markdown += `_Module:_ \`${artifact.module}\`\n\n`;

        if (artifact.children && Object.keys(artifact.children).length > 0) {
            const children = Object.values(artifact.children);
            const serviceFunctions: BaseArtifact[] = [];
            const resourceFunctions: BaseArtifact[] = [];

            children.forEach(child => {
                if (child.type === DIRECTORY_MAP.RESOURCE || child.accessor) {
                    resourceFunctions.push(child);
                } else {
                    serviceFunctions.push(child);
                }
            });

            if (serviceFunctions.length > 0) {
                markdown += `#### Service Functions\n`;
                sortArtifactsByStartLine(serviceFunctions).forEach(func => {
                    const s = func.location?.startLine?.line ?? '?';
                    const e = func.location?.endLine?.line ?? '?';
                    markdown += `- **${func.name}()** (lines ${s}-${e})\n`;
                });
                markdown += `\n`;
            }

            if (resourceFunctions.length > 0) {
                markdown += `#### Resource Functions\n`;
                sortArtifactsByStartLine(resourceFunctions).forEach(resource => {
                    const method = (resource.accessor ?? '').toUpperCase();
                    const resourcePath = normalizeResourcePath(resource.name);
                    const s = resource.location?.startLine?.line ?? '?';
                    const e = resource.location?.endLine?.line ?? '?';
                    markdown += `- **${method}** \`/${resourcePath}\` (lines ${s}-${e})\n`;
                });
                markdown += `\n`;
            }
        }
    }

    if (artifact.type === DIRECTORY_MAP.AUTOMATION) {
        markdown += `#### Automation (lines ${start}-${end})\n\n`;
        if (artifact.module) markdown += `_Module:_ \`${artifact.module}\`\n\n`;
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
