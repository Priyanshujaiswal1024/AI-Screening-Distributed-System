package com.talent.platform.candidaterankingservice.repository;

import com.talent.platform.candidaterankingservice.model.ScreeningReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ScreeningReportRepository extends JpaRepository<ScreeningReport, UUID> {
    List<ScreeningReport> findByJobDescriptionIdOrderByMatchScoreDesc(UUID jobDescriptionId);
    Optional<ScreeningReport> findByResumeIdAndJobDescriptionId(UUID resumeId, UUID jobDescriptionId);
    List<ScreeningReport> findByResumeId(UUID resumeId);
    void deleteByResumeId(UUID resumeId);
}
