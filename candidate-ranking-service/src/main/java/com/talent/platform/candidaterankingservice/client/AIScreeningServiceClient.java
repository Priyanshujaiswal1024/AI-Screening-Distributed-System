package com.talent.platform.candidaterankingservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import java.util.List;

@FeignClient(
    name = "ai-screening-service", 
    path = "/internal", 
    contextId = "aiScreeningClient", 
    fallbackFactory = AIScreeningServiceClientFallbackFactory.class
)
public interface AIScreeningServiceClient {

    @PostMapping("/screening/ollama")
    ScreeningResultDto screenResume(@RequestBody ScreeningRequestDto request);

    class ScreeningRequestDto {
        private String resumeText;
        private String jobDescription;

        public ScreeningRequestDto() {}
        public ScreeningRequestDto(String resumeText, String jobDescription) {
            this.resumeText = resumeText;
            this.jobDescription = jobDescription;
        }
        public String getResumeText() { return resumeText; }
        public void setResumeText(String resumeText) { this.resumeText = resumeText; }
        public String getJobDescription() { return jobDescription; }
        public void setJobDescription(String jobDescription) { this.jobDescription = jobDescription; }
    }

    class ScreeningResultDto {
        private double matchScore;
        private List<String> strengths;
        private List<String> missingSkills;
        private double confidenceScore;
        private String explanation;
        private List<RequirementMatchDto> requirementsChecklist;

        // Bug 3 - Complete Analysis Fields
        private SectionDetailDto education;
        private SectionDetailDto experience;
        private SectionDetailDto projects;
        private SectionDetailDto achievements;
        private SectionDetailDto extracurriculars;
        private SectionDetailDto softSkills;
        private SectionDetailDto overallProfile;

        public ScreeningResultDto() {}
        public double getMatchScore() { return matchScore; }
        public void setMatchScore(double matchScore) { this.matchScore = matchScore; }
        public List<String> getStrengths() { return strengths; }
        public void setStrengths(List<String> strengths) { this.strengths = strengths; }
        public List<String> getMissingSkills() { return missingSkills; }
        public void setMissingSkills(List<String> missingSkills) { this.missingSkills = missingSkills; }
        public double getConfidenceScore() { return confidenceScore; }
        public void setConfidenceScore(double confidenceScore) { this.confidenceScore = confidenceScore; }
        public String getExplanation() { return explanation; }
        public void setExplanation(String explanation) { this.explanation = explanation; }
        public List<RequirementMatchDto> getRequirementsChecklist() { return requirementsChecklist; }
        public void setRequirementsChecklist(List<RequirementMatchDto> requirementsChecklist) { this.requirementsChecklist = requirementsChecklist; }

        public SectionDetailDto getEducation() { return education; }
        public void setEducation(SectionDetailDto education) { this.education = education; }
        public SectionDetailDto getExperience() { return experience; }
        public void setExperience(SectionDetailDto experience) { this.experience = experience; }
        public SectionDetailDto getProjects() { return projects; }
        public void setProjects(SectionDetailDto projects) { this.projects = projects; }
        public SectionDetailDto getAchievements() { return achievements; }
        public void setAchievements(SectionDetailDto achievements) { this.achievements = achievements; }
        public SectionDetailDto getExtracurriculars() { return extracurriculars; }
        public void setExtracurriculars(SectionDetailDto extracurriculars) { this.extracurriculars = extracurriculars; }
        public SectionDetailDto getSoftSkills() { return softSkills; }
        public void setSoftSkills(SectionDetailDto softSkills) { this.softSkills = softSkills; }
        public SectionDetailDto getOverallProfile() { return overallProfile; }
        public void setOverallProfile(SectionDetailDto overallProfile) { this.overallProfile = overallProfile; }

        public static class SectionDetailDto {
            private String details;
            private double confidence;

            public SectionDetailDto() {}
            public String getDetails() { return details; }
            public void setDetails(String details) { this.details = details; }
            public double getConfidence() { return confidence; }
            public void setConfidence(double confidence) { this.confidence = confidence; }
        }

        public static class RequirementMatchDto {
            private String requirement;
            private String status;

            public RequirementMatchDto() {}
            public String getRequirement() { return requirement; }
            public void setRequirement(String requirement) { this.requirement = requirement; }
            public String getStatus() { return status; }
            public void setStatus(String status) { this.status = status; }
        }
    }
}
