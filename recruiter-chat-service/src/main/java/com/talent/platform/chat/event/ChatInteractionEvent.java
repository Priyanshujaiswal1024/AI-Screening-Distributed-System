package com.talent.platform.chat.event;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChatInteractionEvent(
        String conversationId,
        UUID jobId,
        UUID resumeId,
        String userMessage,
        String aiReply,
        LocalDateTime timestamp
) {}