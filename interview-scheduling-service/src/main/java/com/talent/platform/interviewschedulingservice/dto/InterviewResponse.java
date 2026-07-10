package com.talent.platform.interviewschedulingservice.dto;

import com.talent.platform.interviewschedulingservice.model.Interview;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
public class InterviewResponse {

    private UUID id;
    private String candidateEmail;
    private String candidateName;
    private String jobTitle;
    private String companyName;
    private String recruiterName;
    private String recruiterEmail;
    private UUID resumeId;
    private UUID jobId;
    private LocalDate interviewDate;
    private LocalTime interviewTime;
    private Interview.InterviewMode interviewMode;
    private String meetingLink;
    private String notes;
    private Interview.InterviewStatus status;
    private LocalDateTime createdAt;

    public static InterviewResponse from(Interview interview) {
        return InterviewResponse.builder()
                .id(interview.getId())
                .candidateEmail(interview.getCandidateEmail())
                .candidateName(interview.getCandidateName())
                .jobTitle(interview.getJobTitle())
                .companyName(interview.getCompanyName())
                .recruiterName(interview.getRecruiterName())
                .recruiterEmail(interview.getRecruiterEmail())
                .resumeId(interview.getResumeId())
                .jobId(interview.getJobId())
                .interviewDate(interview.getInterviewDate())
                .interviewTime(interview.getInterviewTime())
                .interviewMode(interview.getInterviewMode())
                .meetingLink(interview.getMeetingLink())
                .notes(interview.getNotes())
                .status(interview.getStatus())
                .createdAt(interview.getCreatedAt())
                .build();
    }
}
