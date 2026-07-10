package com.talent.platform.aiscreening.messaging;

import java.util.UUID;

// FIX C2: Single canonical event class used by BOTH producer and consumer
public record ResumeUploadedEvent(UUID resumeId, String fileUrl, UUID recruiterId) {}