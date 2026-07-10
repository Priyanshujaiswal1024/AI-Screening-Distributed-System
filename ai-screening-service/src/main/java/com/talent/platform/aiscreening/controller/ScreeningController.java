package com.talent.platform.aiscreening.controller;

import com.talent.platform.aiscreening.dto.ScreeningRequest;
import com.talent.platform.aiscreening.dto.ScreeningResult;
import com.talent.platform.aiscreening.service.OllamaScreeningService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/screening")
public class ScreeningController {

    private final OllamaScreeningService screeningService;

    public ScreeningController(OllamaScreeningService screeningService) {
        this.screeningService = screeningService;
    }

    @PostMapping("/ollama")
    public ResponseEntity<ScreeningResult> screenCandidate(@RequestBody ScreeningRequest request) {
        if (request.getResumeText() == null || request.getResumeText().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        if (request.getJobDescription() == null || request.getJobDescription().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        
        ScreeningResult result = screeningService.screenResume(request);
        return ResponseEntity.ok(result);
    }
}
