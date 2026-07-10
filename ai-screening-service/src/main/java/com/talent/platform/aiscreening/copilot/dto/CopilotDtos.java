package com.talent.platform.aiscreening.copilot.dto;//package com.talent.platform.copilot.dto;

import java.time.LocalDateTime;
import java.util.List;

public class CopilotDtos {

    public record CopilotRequest(
            String message,
            String jobDescriptionId,   // optional context
            String conversationId,     // optional — server generates if absent
            CopilotMode mode           // TOOL_ASSISTED (default) | AGENT
    ) {
        public CopilotRequest {
            if (mode == null) mode = CopilotMode.TOOL_ASSISTED;
        }
    }

    public enum CopilotMode { TOOL_ASSISTED, AGENT }

    public record CopilotResponse(
            String conversationId,
            String answer,
            List<String> toolsUsed,
            LocalDateTime timestamp
    ) {}
}