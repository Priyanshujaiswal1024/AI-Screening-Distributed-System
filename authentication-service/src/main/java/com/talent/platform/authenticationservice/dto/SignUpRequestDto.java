// SignUpRequestDto.java
package com.talent.platform.authenticationservice.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SignUpRequestDto {
    @Email @NotBlank  private String email;
    @NotBlank @Size(min = 8) private String password;
    @NotBlank  private String fullName;
    @NotBlank  private String companyName;
    private String phone;
}