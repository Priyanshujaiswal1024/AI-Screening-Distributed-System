package com.talent.platform.authenticationservice.config;

import com.talent.platform.authenticationservice.model.AuthUser;
import com.talent.platform.authenticationservice.model.RoleType;
import com.talent.platform.authenticationservice.AuthUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Set;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class AdminSeeder {

    private final AuthUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public CommandLineRunner seedAdmin() {
        return args -> {
            String adminEmail = "admin@talent.com";
            if (!userRepository.existsByEmail(adminEmail)) {
                userRepository.save(AuthUser.builder()
                        .email(adminEmail)
                        .passwordHash(passwordEncoder.encode("Admin@123"))
                        .fullName("Super Admin")
                        .companyName("TalentPlatform")
                        .emailVerified(true)
                        .roles(Set.of(RoleType.ADMIN))
                        .build());
                log.info("Admin seeded: email={}", adminEmail);
            }
        };
    }
}