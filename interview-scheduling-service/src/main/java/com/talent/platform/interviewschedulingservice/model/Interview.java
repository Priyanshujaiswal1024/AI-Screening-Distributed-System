package com.talent.platform.interviewschedulingservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "interviews")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Interview {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // Candidate info
    @Column(name = "candidate_email", nullable = false)
    private String candidateEmail;

    @Column(name = "candidate_name", nullable = false)
    private String candidateName;

    // Job info
    @Column(name = "job_title", nullable = false)
    private String jobTitle;

    @Column(name = "company_name")
    private String companyName;

    // Recruiter info
    @Column(name = "recruiter_name")
    private String recruiterName;

    @Column(name = "recruiter_email")
    private String recruiterEmail;

    // Resume & Job references (optional, for tracking)
    @Column(name = "resume_id")
    private UUID resumeId;

    @Column(name = "job_id")
    private UUID jobId;

    // Schedule
    @Column(name = "interview_date", nullable = false)
    private LocalDate interviewDate;

    @Column(name = "interview_time", nullable = false)
    private LocalTime interviewTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "interview_mode", nullable = false)
    private InterviewMode interviewMode;

    @Column(name = "meeting_link")
    private String meetingLink;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    // Status tracking
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private InterviewStatus status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = InterviewStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum InterviewMode {
        ONLINE, IN_PERSON, HYBRID
    }

    public enum InterviewStatus {
        PENDING,
        CONFIRMED,
        RESCHEDULE_REQUESTED,
        RESCHEDULED,
        CANCELLED,
        NO_RESPONSE,   // Auto-set after 5 days of no candidate reply
        COMPLETED
    }
}
