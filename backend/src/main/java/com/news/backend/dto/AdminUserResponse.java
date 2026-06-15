package com.news.backend.dto;

import com.news.backend.entity.User;

public record AdminUserResponse(Long id, String name, String email, String role, boolean blocked) {
    public static AdminUserResponse from(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.isBlocked()
        );
    }
}
