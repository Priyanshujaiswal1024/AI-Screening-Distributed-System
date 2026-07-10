package com.talent.platform.resumemanagementservice.repository;

import com.talent.platform.resumemanagementservice.model.SagaInstance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface SagaInstanceRepository extends JpaRepository<SagaInstance, UUID> {
    List<SagaInstance> findByStatusInAndTimeoutAtBefore(List<String> statuses, LocalDateTime threshold);
}
