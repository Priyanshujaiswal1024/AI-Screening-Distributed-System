package com.talent.platform.authenticationservice.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor
public class RegisterRequest {
    @Email @NotBlank
    private String email;
    @NotBlank @Size(min = 8)
    private String password;
    @NotBlank
    private String companyName;
    @NotBlank @Size(min = 6, max = 6)
    private String otp;
}