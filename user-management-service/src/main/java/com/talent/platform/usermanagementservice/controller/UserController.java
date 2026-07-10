package com.talent.platform.usermanagementservice.controller;

import com.talent.platform.usermanagementservice.dto.CreateRecruiterRequest;
import com.talent.platform.usermanagementservice.dto.RecruiterResponse;
import com.talent.platform.usermanagementservice.service.RecruiterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final RecruiterService recruiterService; // FIX W1: service layer

    // Called by auth-service after successful registration via Kafka consumer
    @PostMapping
    public ResponseEntity<?> createProfile(
            @Valid @RequestBody CreateRecruiterRequest request) {
        try {
            var recruiter = recruiterService.createProfile(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(RecruiterResponse.from(recruiter));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<?> getByEmail(@PathVariable String email) {
        try {
            return ResponseEntity.ok(
                    RecruiterResponse.from(recruiterService.getByEmail(email)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(
                    RecruiterResponse.from(recruiterService.getById(id)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProfile(
            @PathVariable UUID id,
            @Valid @RequestBody CreateRecruiterRequest request) {
        try {
            return ResponseEntity.ok(
                    RecruiterResponse.from(recruiterService.updateProfile(id, request)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}