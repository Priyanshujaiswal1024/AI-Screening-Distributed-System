// LoginResponseDto.java
package com.talent.platform.authenticationservice.dto;

import lombok.*;

@Getter @Builder
public class LoginResponseDto {
    private String accessToken;
    private String tokenType;
    private long   expiresIn;
    private String userId;
    private String role;
}