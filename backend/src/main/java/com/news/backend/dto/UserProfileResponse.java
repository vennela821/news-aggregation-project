package com.news.backend.dto;

import com.news.backend.entity.User;

public record UserProfileResponse(String name, String email, String role) {
    public static UserProfileResponse from(User user) {
        return new UserProfileResponse(user.getName(), user.getEmail(), user.getRole());
    }
}
