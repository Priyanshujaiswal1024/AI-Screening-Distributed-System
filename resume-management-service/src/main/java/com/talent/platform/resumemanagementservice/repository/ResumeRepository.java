package com.talent.platform.resumemanagementservice.repository;

import com.talent.platform.resumemanagementservice.model.CandidateResume;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ResumeRepository extends JpaRepository<CandidateResume, UUID> {


    /**
     * Case-insensitive search across candidate name and email.
     * Used by /internal/resumes/search called from recruiter-chat-service tools.
     */
    @Query("SELECT r FROM CandidateResume r WHERE " +
            "LOWER(r.candidateName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(r.candidateEmail) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<CandidateResume> searchByNameOrEmail(@Param("query") String query);
    List<CandidateResume> findByRecruiterId(UUID recruiterId);
    List<CandidateResume> findByRecruiterIdAndArchived(UUID recruiterId, boolean archived);


    // ── NEW: used by /internal/resumes/search ─────────────────────────────────
    //
    // Single query handles all filter combinations cleanly.
    // Empty-string params are treated as "no filter" via the OR :x = '' trick.
    // status = 'ALL' is handled at the call site by passing null here.
    //
    // For skill-keyword filtering (requires resume_chunks which we don't own),
    // we fall back to name/email ILIKE — good enough for v1.
    // When ai-screening-service passes resolvedIds, switch to the ID-based variant below.

    @Query("""
            SELECT r FROM CandidateResume r
            WHERE (:status IS NULL OR r.status = :status)
              AND (:nameLike = '' OR LOWER(r.candidateName) LIKE LOWER(CONCAT('%', :nameLike, '%')))
              AND (:skillLike = '' OR
                   LOWER(r.candidateName)  LIKE LOWER(CONCAT('%', :skillLike, '%')) OR
                   LOWER(r.candidateEmail) LIKE LOWER(CONCAT('%', :skillLike, '%')))
              AND r.archived = :archived
            ORDER BY r.createdAt DESC
            """)
    List<CandidateResume> searchCandidates(
            @Param("status")    String status,
            @Param("nameLike")  String nameLike,
            @Param("skillLike") String skillLike,
            @Param("archived")  boolean archived,
            Pageable pageable
    );

    // ── v2 skill search: ai-screening-service resolves IDs from resume_chunks,
    //    passes them here. Ownership stays clean — no cross-DB join needed.

    @Query("""
            SELECT r FROM CandidateResume r
            WHERE r.id IN :ids
              AND (:status IS NULL OR r.status = :status)
            ORDER BY r.createdAt DESC
            """)
    List<CandidateResume> findByIdInAndStatus(
            @Param("ids")    List<UUID> ids,
            @Param("status") String status,
            Pageable pageable
    );

    List<CandidateResume> findByCandidateEmailAndJobIdAndStatus(String candidateEmail, UUID jobId, String status);
}