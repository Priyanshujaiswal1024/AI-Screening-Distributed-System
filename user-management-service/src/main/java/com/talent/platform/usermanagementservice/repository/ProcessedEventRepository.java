package com.talent.platform.usermanagementservice.repository;

import com.talent.platform.usermanagementservice.model.ProcessedEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;

@Repository
public interface ProcessedEventRepository extends JpaRepository<ProcessedEvent, String> {
    void deleteByProcessedAtBefore(LocalDateTime threshold);
}
