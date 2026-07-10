package com.talent.platform.chat.controller;

import com.talent.platform.chat.dto.ChatRequest;
import com.talent.platform.chat.dto.ChatResponse;
import com.talent.platform.chat.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;  // FIX E1: correct import
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @PostMapping("/message")
    public ResponseEntity<ChatResponse> sendMessage(
            @Valid @RequestBody ChatRequest request) {

        String conversationId = (request.getConversationId() != null
                && !request.getConversationId().isBlank())
                ? request.getConversationId()
                : UUID.randomUUID().toString();

        String reply = chatService.generateResponse(
                request.getJobId(),
                request.getResumeId(),
                request.getMessage(),
                conversationId);

        return ResponseEntity.ok(ChatResponse.builder()
                .conversationId(conversationId)
                .reply(reply)
                .timestamp(LocalDateTime.now())
                .build());
    }
}