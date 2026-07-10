package com.talent.platform.authenticationservice.service;

import com.talent.platform.authenticationservice.dto.*;
import com.talent.platform.authenticationservice.model.AuthUser;
import com.talent.platform.authenticationservice.model.RoleType;
import com.talent.platform.authenticationservice.AuthUserRepository;
import com.talent.platform.authenticationservice.service.JWTService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final AuthUserRepository     userRepository;
    private final PasswordEncoder        passwordEncoder;
    private final OtpService             otpService;
    private final PendingUserCacheService pendingCache;
    private final JWTService             jwtService;
    private final AuthenticationManager  authManager;
    private final OutboxEventPublisher   outboxEventPublisher;

    // Step 1: Cache signup data + send OTP
    @Transactional
    public String signup(SignUpRequestDto dto) {
        if (userRepository.existsByEmail(dto.getEmail()))
            throw new RuntimeException("Email already registered: " + dto.getEmail());

        pendingCache.save(dto.getEmail(), dto);
        String otp = otpService.generateAndSave(dto.getEmail());

        // Send via Kafka → notification-service sends email
        publishEvent("SIGNUP_OTP", dto.getEmail(), Map.of("otp", otp));
        log.info("Signup OTP generated for: {}", dto.getEmail());

        return "OTP sent to " + dto.getEmail() + ". Verify to complete registration.";
    }

    // Step 2: Verify OTP → create user in DB
    @Transactional
    public LoginResponseDto verifyOtp(VerifyOtpRequestDto dto) {
        if (!otpService.verifyAndDelete(dto.getEmail(), dto.getOtp()))
            throw new RuntimeException("Invalid or expired OTP.");

        if (userRepository.existsByEmail(dto.getEmail()))
            throw new RuntimeException("User already verified.");

        SignUpRequestDto pending = pendingCache.get(dto.getEmail());

        AuthUser user = AuthUser.builder()
                .email(pending.getEmail())
                .passwordHash(passwordEncoder.encode(pending.getPassword()))
                .fullName(pending.getFullName())
                .companyName(pending.getCompanyName())
                .phone(pending.getPhone())
                .emailVerified(true)
                .roles(Set.of(RoleType.RECRUITER))
                .build();

        userRepository.save(user);
        pendingCache.delete(dto.getEmail());

        publishEvent("USER_REGISTERED", user.getEmail(),
                Map.of("companyName", user.getCompanyName(),
                        "fullName", user.getFullName()));

        log.info("User registered: {}", user.getEmail());
        return buildResponse(user);
    }

    // Resend OTP
    @Transactional
    public String resendOtp(String email) {
        if (userRepository.existsByEmail(email))
            throw new RuntimeException("Email already verified. Please login.");

        pendingCache.get(email); // throws if session expired
        String otp = otpService.generateAndSave(email);
        publishEvent("SIGNUP_OTP", email, Map.of("otp", otp));
        return "OTP resent to " + email;
    }

    // Login
    public LoginResponseDto login(LoginRequestDto dto) {
        authManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        dto.getEmail(), dto.getPassword()));

        AuthUser user = userRepository.findByEmail(dto.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found."));

        if (!user.isEmailVerified())
            throw new RuntimeException("Please verify your email before logging in.");

        log.info("Login successful: {}", dto.getEmail());
        return buildResponse(user);
    }

    // Forgot password
    public String forgotPassword(String email) {
        String otp = otpService.generateAndSave("forgot:" + email);
        publishEvent("FORGOT_PASSWORD", email, Map.of("otp", otp));
        return "Password reset OTP sent to " + email;
    }

    // Reset password
    @Transactional
    public String resetPassword(String email, String otp, String newPassword) {
        if (!otpService.verifyAndDelete("forgot:" + email, otp))
            throw new RuntimeException("Invalid or expired OTP.");

        AuthUser user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found."));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        publishEvent("PASSWORD_CHANGED", email, Map.of());
        return "Password reset successfully.";
    }

    // Change password (requires current password verification)
    @Transactional
    public String changePassword(String email, String currentPassword, String newPassword) {
        if (email == null || email.isBlank())
            throw new RuntimeException("Email is required.");
        if (currentPassword == null || newPassword == null)
            throw new RuntimeException("Current password and new password are required.");

        // Verify current password via AuthManager
        authManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, currentPassword));

        AuthUser user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found."));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        publishEvent("PASSWORD_CHANGED", email, Map.of());
        return "Password changed successfully.";
    }

    private LoginResponseDto buildResponse(AuthUser user) {
        return LoginResponseDto.builder()
                .accessToken(jwtService.generateToken(user))
                .tokenType("Bearer")
                .expiresIn(3600)
                .userId(user.getId().toString())
                .role(user.getRoles().iterator().next().name())
                .build();
    }

    private void publishEvent(String type, String email, Map<String, Object> extra) {
        java.util.HashMap<String, Object> event = new java.util.HashMap<>(extra);
        event.put("eventType", type);
        event.put("email", email);
        outboxEventPublisher.publish("auth-events", email, event);
    }
}