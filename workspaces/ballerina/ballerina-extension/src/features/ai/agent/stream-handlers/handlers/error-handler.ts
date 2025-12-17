// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { StreamEventHandler, StreamErrorException } from "../stream-event-handler";
import { StreamContext } from "../stream-context";
import { getErrorMessage } from "../../../utils/ai-utils";
import { sendAgentDidCloseForProjects } from "../../../utils/project/ls-schema-notifications";
import { cleanupTempProject } from "../../../utils/project/temp-project";
import { AIChatStateMachine } from "../../../../../views/ai-panel/aiChatMachine";
import {
    sendTelemetryException,
    TM_EVENT_BALLERINA_AI_GENERATION_FAILED,
    CMP_BALLERINA_AI_GENERATION
} from "../../../../telemetry";
import { extension } from "../../../../../BalExtensionContext";

/**
 * Handles error events from the stream.
 * Performs cleanup and emits error event to the UI.
 */
export class ErrorHandler implements StreamEventHandler {
    readonly eventType = "error";

    canHandle(eventType: string): boolean {
        return eventType === this.eventType;
    }

    async handle(part: any, context: StreamContext): Promise<void> {
        const error = part.error;
        console.error("[Agent] Error:", error);

        // Get state context for telemetry
        const stateContext = AIChatStateMachine.context();
        const errorTime = Date.now();

        // Convert error to Error object for telemetry
        const errorObj = error instanceof Error ? error : new Error(String(error));

        // Send telemetry for generation error
        sendTelemetryException(
            extension.ballerinaExtInstance,
            errorObj,
            CMP_BALLERINA_AI_GENERATION,
            {
                event: TM_EVENT_BALLERINA_AI_GENERATION_FAILED,
                projectId: stateContext.projectId || 'unknown',
                messageId: context.messageId,
                errorMessage: getErrorMessage(error),
                errorType: errorObj.name || 'Unknown',
                generationStartTime: context.generationStartTime.toString(),
                errorTime: errorTime.toString(),
                durationMs: (errorTime - context.generationStartTime).toString(),
            }
        );

        if (context.shouldCleanup) {
            sendAgentDidCloseForProjects(context.tempProjectPath, context.projects);
            cleanupTempProject(context.tempProjectPath);
        }

        context.eventHandler({ type: "error", content: getErrorMessage(error) });

        // Throw exception to exit stream loop and return tempProjectPath
        throw new StreamErrorException(context.tempProjectPath);
    }
}
