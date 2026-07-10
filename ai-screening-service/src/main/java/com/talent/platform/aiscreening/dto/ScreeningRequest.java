package com.talent.platform.aiscreening.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScreeningRequest {
    private String resumeText;
    private String jobDescription;
}
