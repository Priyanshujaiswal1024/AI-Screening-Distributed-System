package com.talent.platform.aiscreening.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScreeningResult {
    private double matchScore;
    private List<String> strengths;
    private List<String> missingSkills;
    private double confidenceScore;
    private String explanation;
    private List<RequirementMatch> requirementsChecklist;

    // Bug 3 - Complete Analysis Fields
    private SectionDetail education;
    private SectionDetail experience;
    private SectionDetail projects;
    private SectionDetail achievements;
    private SectionDetail extracurriculars;
    private SectionDetail softSkills;
    private SectionDetail overallProfile;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SectionDetail {
        private String details;
        private double confidence;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RequirementMatch {
        private String requirement;
        private String status; // "Matched" or "Unmatched"
    }
}

