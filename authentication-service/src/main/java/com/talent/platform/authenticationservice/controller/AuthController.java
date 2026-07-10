package com.talent.platform.authenticationservice.controller;

import com.talent.platform.authenticationservice.dto.*;
import com.talent.platform.authenticationservice.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup-otp")
    public ResponseEntity<?> signupOtp(@Valid @RequestBody SignUpRequestDto dto) {
        return ResponseEntity.ok(Map.of("message", authService.signup(dto)));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<LoginResponseDto> verifyOtp(
            @Valid @RequestBody VerifyOtpRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(authService.verifyOtp(dto));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(@RequestBody Map<String, String> req) {
        return ResponseEntity.ok(
                Map.of("message", authService.resendOtp(req.get("email"))));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDto> login(
            @Valid @RequestBody LoginRequestDto dto) {
        return ResponseEntity.ok(authService.login(dto));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> req) {
        return ResponseEntity.ok(
                Map.of("message", authService.forgotPassword(req.get("email"))));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> req) {
        return ResponseEntity.ok(Map.of("message",
                authService.resetPassword(
                        req.get("email"),
                        req.get("otp"),
                        req.get("newPassword"))));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestBody Map<String, String> req,
            @RequestHeader(value = "X-User-Email", required = false) String gatewayEmail) {
        // Use gateway-injected email if available, otherwise fall back to body field
        String email = gatewayEmail != null && !gatewayEmail.isBlank()
                ? gatewayEmail
                : req.get("email");
        return ResponseEntity.ok(Map.of("message",
                authService.changePassword(email,
                        req.get("currentPassword"),
                        req.get("newPassword"))));
    }
}