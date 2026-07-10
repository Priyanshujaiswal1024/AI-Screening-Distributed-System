package com.talent.platform.usermanagementservice.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter @Builder
public class RecruiterResponse {
    private UUID id;
    private String email;
    private String companyName;
    private String fullName;
    private String phone;
    private boolean active;
    private LocalDateTime createdAt;

    public static RecruiterResponse from(
            com.talent.platform.usermanagementservice.model.Recruiter r) {
        return RecruiterResponse.builder()
                .id(r.getId())
                .email(r.getEmail())
                .companyName(r.getCompanyName())
                .fullName(r.getFullName())
                .phone(r.getPhone())
                .active(r.isActive())
                .createdAt(r.getCreatedAt())
                .build();
    }
}