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

import * as fs from 'fs';
import * as path from 'path';

interface TelemetryEvent {
    timestamp: string;
    eventName: string;
    properties: { [key: string]: string };
    measurements?: { [key: string]: number };
}

const TELEMETRY_FILE_PATH = path.join(__dirname, '../src/features/telemetry/telemetry-events.json');

// For debugging: log the file path on module load
console.log(`[Telemetry] Events will be saved to: ${TELEMETRY_FILE_PATH}`);

/**
 * Saves a telemetry event to a local JSON file for local testing and debugging
 */
export function saveLocalTelemetryEvent(
    eventName: string,
    properties: { [key: string]: string },
    measurements?: { [key: string]: number }
): void {
    try {
        const event: TelemetryEvent = {
            timestamp: new Date().toISOString(),
            eventName,
            properties,
            measurements
        };

        let events: TelemetryEvent[] = [];

        // Read existing events if file exists
        if (fs.existsSync(TELEMETRY_FILE_PATH)) {
            const fileContent = fs.readFileSync(TELEMETRY_FILE_PATH, 'utf-8');
            if (fileContent.trim()) {
                events = JSON.parse(fileContent);
            }
        }

        // Add new event
        events.push(event);

        // Write back to file with pretty formatting
        fs.writeFileSync(TELEMETRY_FILE_PATH, JSON.stringify(events, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error saving local telemetry event:', error);
    }
}

/**
 * Clears all local telemetry events from the JSON file
 */
export function clearLocalTelemetryEvents(): void {
    try {
        fs.writeFileSync(TELEMETRY_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
    } catch (error) {
        console.error('Error clearing local telemetry events:', error);
    }
}

/**
 * Reads all local telemetry events from the JSON file
 */
export function getLocalTelemetryEvents(): TelemetryEvent[] {
    try {
        if (fs.existsSync(TELEMETRY_FILE_PATH)) {
            const fileContent = fs.readFileSync(TELEMETRY_FILE_PATH, 'utf-8');
            if (fileContent.trim()) {
                return JSON.parse(fileContent);
            }
        }
        return [];
    } catch (error) {
        console.error('Error reading local telemetry events:', error);
        return [];
    }
}

/**
 * Returns the path to the telemetry events JSON file
 */
export function getTelemetryFilePath(): string {
    return TELEMETRY_FILE_PATH;
}
