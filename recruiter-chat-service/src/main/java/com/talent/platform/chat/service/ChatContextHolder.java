package com.talent.platform.chat.service;

import java.util.UUID;

/**
 * Thread-local store to track the active jobId and resumeId context during a chat request.
 * Allows singleton tools to fallback to active contexts if the LLM fails to extract/pass arguments.
 */
public class ChatContextHolder {

    private static final ThreadLocal<UUID> currentJobId = new ThreadLocal<>();
    private static final ThreadLocal<UUID> currentResumeId = new ThreadLocal<>();

    public static void set(UUID jobId, UUID resumeId) {
        currentJobId.set(jobId);
        currentResumeId.set(resumeId);
    }

    public static UUID getJobId() {
        return currentJobId.get();
    }

    public static UUID getResumeId() {
        return currentResumeId.get();
    }

    public static void clear() {
        currentJobId.remove();
        currentResumeId.remove();
    }
}
