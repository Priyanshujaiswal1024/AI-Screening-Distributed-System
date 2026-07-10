// LoginRequestDto.java
package com.talent.platform.authenticationservice.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class LoginRequestDto {
    @Email @NotBlank private String email;
    @NotBlank        private String password;
}