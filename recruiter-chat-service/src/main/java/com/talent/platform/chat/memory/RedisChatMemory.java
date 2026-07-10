package com.talent.platform.chat.memory;//package main.java.com.talent.platform.chat.memory;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@RequiredArgsConstructor
public class RedisChatMemory implements ChatMemory {

    private static final String KEY_PREFIX = "chat:memory:";
    private static final Duration TTL = Duration.ofHours(24);
    private static final int MAX_MESSAGES = 40; // sliding window

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public void add(String conversationId, List<Message> messages) {
        String key = KEY_PREFIX + conversationId;
        try {
            List<Map<String, String>> current = load(key);
            for (Message msg : messages) {
                current.add(Map.of(
                        "type", msg.getMessageType().name(),
                        "content", msg.getText()
                ));
            }
            // Sliding window — keep last MAX_MESSAGES only
            if (current.size() > MAX_MESSAGES) {
                current = current.subList(current.size() - MAX_MESSAGES, current.size());
            }
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(current), TTL);
        } catch (Exception e) {
            log.error("Failed to save chat memory for conversationId={}", conversationId, e);
        }
    }

    @Override
    public List<Message> get(String conversationId, int lastN) {
        String key = KEY_PREFIX + conversationId;
        try {
            List<Map<String, String>> stored = load(key);
            List<Message> messages = stored.stream()
                    .map(m -> {
                        String type = m.get("type");
                        String content = m.get("content");
                        return MessageType.USER.name().equals(type)
                                ? (Message) new UserMessage(content)
                                : new AssistantMessage(content);
                    })
                    .toList();
            if (lastN > 0 && messages.size() > lastN) {
                return messages.subList(messages.size() - lastN, messages.size());
            }
            return messages;
        } catch (Exception e) {
            log.error("Failed to load chat memory for conversationId={}", conversationId, e);
            return new ArrayList<>();
        }
    }

    @Override
    public void clear(String conversationId) {
        redisTemplate.delete(KEY_PREFIX + conversationId);
    }

    private List<Map<String, String>> load(String key) throws Exception {
        String raw = redisTemplate.opsForValue().get(key);
        if (raw == null) return new ArrayList<>();
        return objectMapper.readValue(raw, new TypeReference<>() {});
    }
}