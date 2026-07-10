package com.talent.platform.jobdescriptionservice.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.util.List;
import java.util.UUID;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateJobRequest {

    @NotNull(message = "recruiterId is required")
    private UUID recruiterId;

    @NotBlank(message = "title is required")
    @Size(max = 255)
    private String title;

    @NotBlank(message = "rawText is required")
    private String rawText;

    @NotEmpty(message = "at least one skill is required")
    private List<String> keySkills;

    @Min(0) @Max(30)
    private int minExperienceYears;
}