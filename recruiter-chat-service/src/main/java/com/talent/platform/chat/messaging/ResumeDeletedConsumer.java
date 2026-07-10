package com.talent.platform.chat.messaging;

import com.talent.platform.chat.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class ResumeDeletedConsumer {

    private final ChatMessageRepository chatMessageRepository;

    @KafkaListener(topics = "resume-deleted", groupId = "recruiter-chat-delete-group")
    @Transactional
    public void onResumeDeleted(Map<String, Object> event) {
        String resumeIdStr = String.valueOf(event.get("resumeId"));
        log.info("[ChatConsumer] Received resume-deleted: resumeId={}", resumeIdStr);

        try {
            UUID resumeId = UUID.fromString(resumeIdStr);
            chatMessageRepository.deleteByResumeId(resumeId);
            log.info("[ChatConsumer] Cleaned up chat messages for resumeId={}", resumeId);
        } catch (Exception e) {
            log.error("[ChatConsumer] Error cleaning up chat messages for resumeId={}: {}", resumeIdStr, e.getMessage());
        }
    }
}
