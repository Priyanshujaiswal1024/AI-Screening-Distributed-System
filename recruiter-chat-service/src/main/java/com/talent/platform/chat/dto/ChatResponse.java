package com.talent.platform.chat.dto;//package main.java.com.talent.platform.chat.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ChatResponse {
    private String conversationId;
    private String reply;
    private LocalDateTime timestamp;
}