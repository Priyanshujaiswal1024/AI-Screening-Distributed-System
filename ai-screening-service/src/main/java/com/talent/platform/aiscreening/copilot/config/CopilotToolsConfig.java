package com.talent.platform.aiscreening.copilot.config;

import com.talent.platform.aiscreening.tools.*;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.ToolCallbacks;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CopilotToolsConfig {

    /**
     * FIX: Added bean name "recruiterTools".
     *      CopilotService injects ToolCallback[] — Spring cannot resolve array beans
     *      without a name qualifier. Without the name, Spring tries to inject each
     *      element individually → NoSuchBeanDefinitionException at startup.
     */
    @Bean("recruiterTools")
    public ToolCallback[] recruiterTools(
            ResumeSearchTool        resumeSearchTool,
            CandidateRankingTool    candidateRankingTool,
            SkillGapAnalysisTool    skillGapAnalysisTool,
            CandidateSummaryTool    candidateSummaryTool,
            InterviewQuestionTool   interviewQuestionTool
    ) {
        return ToolCallbacks.from(
                resumeSearchTool,
                candidateRankingTool,
                skillGapAnalysisTool,
                candidateSummaryTool,
                interviewQuestionTool
        );
    }
}