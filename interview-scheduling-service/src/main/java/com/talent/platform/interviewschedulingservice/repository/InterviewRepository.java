package com.talent.platform.interviewschedulingservice.repository;

import com.talent.platform.interviewschedulingservice.model.Interview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InterviewRepository extends JpaRepository<Interview, UUID> {

    List<Interview> findByRecruiterEmailOrderByCreatedAtDesc(String recruiterEmail);

    List<Interview> findByCandidateEmailOrderByInterviewDateAsc(String candidateEmail);

    List<Interview> findByJobIdOrderByCreatedAtDesc(UUID jobId);

    List<Interview> findByResumeIdOrderByCreatedAtDesc(UUID resumeId);

    // Used by auto-cancel scheduler: find PENDING invites older than cutoff time
    List<Interview> findByStatusAndCreatedAtBefore(Interview.InterviewStatus status, java.time.LocalDateTime cutoff);
}
