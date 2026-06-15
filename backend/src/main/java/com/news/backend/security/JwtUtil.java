package com.news.backend.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

@Component
public class JwtUtil {
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration-ms}")
    private long expirationMs;

    public String generateToken(String email) {
        long expiresAt = Instant.now().toEpochMilli() + expirationMs;
        String payload = email + ":" + expiresAt;
        String encodedPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        return encodedPayload + "." + sign(encodedPayload);
    }

    public String extractEmail(String token) {
        String payload = decodePayload(token);
        return payload.split(":", 2)[0];
    }

    public boolean isValid(String token, String email) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 2 || !sign(parts[0]).equals(parts[1])) {
                return false;
            }
            String payload = decodePayload(token);
            String[] values = payload.split(":", 2);
            return values[0].equals(email) && Long.parseLong(values[1]) > Instant.now().toEpochMilli();
        } catch (RuntimeException ex) {
            return false;
        }
    }

    private String decodePayload(String token) {
        String payloadPart = token.split("\\.")[0];
        byte[] payload = Base64.getUrlDecoder().decode(payloadPart);
        return new String(payload, StandardCharsets.UTF_8);
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to sign token", ex);
        }
    }
}
