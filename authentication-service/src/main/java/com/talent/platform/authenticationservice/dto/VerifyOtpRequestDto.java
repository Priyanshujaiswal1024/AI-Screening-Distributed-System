// VerifyOtpRequestDto.java
package com.talent.platform.authenticationservice.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class VerifyOtpRequestDto {
    @Email @NotBlank   private String email;
    @NotBlank @Size(min = 6, max = 6) private String otp;
}