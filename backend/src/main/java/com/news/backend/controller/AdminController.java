package com.news.backend.controller;

import com.news.backend.dto.AdminUserResponse;
import com.news.backend.entity.User;
import com.news.backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final UserRepository userRepository;

    public AdminController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/users")
    public List<AdminUserResponse> users() {
        return userRepository.findAll().stream()
                .map(AdminUserResponse::from)
                .toList();
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<AdminUserResponse> updateRole(@PathVariable Long id, @RequestBody Map<String, String> request) {
        String role = normalizeRole(request.get("role"));
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setRole(role);
        return ResponseEntity.ok(AdminUserResponse.from(userRepository.save(user)));
    }

    @PatchMapping("/users/{id}/block")
    public ResponseEntity<AdminUserResponse> updateBlock(@PathVariable Long id, @RequestBody Map<String, Boolean> request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setBlocked(Boolean.TRUE.equals(request.get("blocked")));
        return ResponseEntity.ok(AdminUserResponse.from(userRepository.save(user)));
    }

    private String normalizeRole(String role) {
        if (role == null) {
            throw new IllegalArgumentException("Role is required");
        }
        String normalized = role.trim().toUpperCase();
        if (!List.of("READER", "STUDENT", "ADMIN").contains(normalized)) {
            throw new IllegalArgumentException("Role must be READER, STUDENT, or ADMIN");
        }
        return normalized;
    }
}
