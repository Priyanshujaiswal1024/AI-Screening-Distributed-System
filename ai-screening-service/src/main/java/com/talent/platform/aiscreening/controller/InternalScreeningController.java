package com.talent.platform.aiscreening.controller;

import com.talent.platform.aiscreening.dto.ScreeningRequest;
import com.talent.platform.aiscreening.dto.ScreeningResult;
import com.talent.platform.aiscreening.service.OllamaScreeningService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/screening")
@RequiredArgsConstructor
public class InternalScreeningController {

    private final OllamaScreeningService screeningService;

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
