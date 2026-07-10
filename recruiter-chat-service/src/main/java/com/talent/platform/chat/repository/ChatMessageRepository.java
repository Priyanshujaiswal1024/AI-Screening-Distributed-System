package com.talent.platform.chat.repository;

import com.talent.platform.chat.model.ChatMessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, Long> {
    List<ChatMessageEntity> findBySessionIdOrderByTimestampAsc(String sessionId);
    void deleteByResumeId(java.util.UUID resumeId);
}
