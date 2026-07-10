package com.talent.platform.chat.dto;//package main.java.com.talent.platform.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
public class ChatRequest {

    private UUID jobId;      // optional
    private UUID resumeId;   // optional — triggers RAG when present

    @NotBlank(message = "message must not be blank")  // FIX #6
    @Size(max = 4000, message = "message too long")
    private String message;

    private String conversationId; // optional — server generates one if absent
}