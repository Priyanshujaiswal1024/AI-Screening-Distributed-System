package com.talent.platform.interviewschedulingservice.dto;

import com.talent.platform.interviewschedulingservice.model.Interview;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
public class ScheduleInterviewRequest {

    // Candidate info (required)
    private String candidateEmail;
    private String candidateName;

    // Job info (required)
    private String jobTitle;
    private String companyName;

    // References (optional)
    private UUID resumeId;
    private UUID jobId;

    // Schedule (required)
    private LocalDate interviewDate;
    private LocalTime interviewTime;
    private Interview.InterviewMode interviewMode;

    // Optional
    private String meetingLink;
    private String notes;
}
