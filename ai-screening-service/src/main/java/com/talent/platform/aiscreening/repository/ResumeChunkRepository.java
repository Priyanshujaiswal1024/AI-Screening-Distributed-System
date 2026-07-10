package com.talent.platform.aiscreening.repository;

import com.talent.platform.aiscreening.model.ResumeChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ResumeChunkRepository extends JpaRepository<ResumeChunk, UUID> {
    List<ResumeChunk> findByResumeId(UUID resumeId);
    void deleteByResumeId(UUID resumeId);
}
