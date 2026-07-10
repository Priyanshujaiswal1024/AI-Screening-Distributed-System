package com.talent.platform.chat.model;//package main.java.com.talent.platform.chat.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "chat_messages", indexes = {
        @Index(name = "idx_chat_session", columnList = "sessionId"),
        @Index(name = "idx_chat_job",     columnList = "jobId"),
        @Index(name = "idx_chat_resume",  columnList = "resumeId")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatMessageEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String sessionId;

    @Column(nullable = false)
    private String role; // "USER" or "ASSISTANT"

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    // FIX #12: Added for auditability — query all messages for a job or resume
    @Column
    private UUID jobId;

    @Column
    private UUID resumeId;
}