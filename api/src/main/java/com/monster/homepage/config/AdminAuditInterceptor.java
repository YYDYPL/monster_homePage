package com.monster.homepage.config;

import com.monster.homepage.content.AuditLog;
import com.monster.homepage.content.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Set;

@Component
public class AdminAuditInterceptor implements HandlerInterceptor {
    private static final Set<String> MUTATIONS = Set.of("POST", "PUT", "PATCH", "DELETE");
    private final AuditLogRepository auditLogs;

    public AdminAuditInterceptor(AuditLogRepository auditLogs) {
        this.auditLogs = auditLogs;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        if (!MUTATIONS.contains(request.getMethod()) || response.getStatus() < 200 || response.getStatus() >= 400) return;
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) return;

        String relative = request.getRequestURI().replaceFirst("^/api/admin/?", "");
        String[] segments = relative.isBlank() ? new String[0] : relative.split("/");
        AuditLog log = new AuditLog();
        log.setUsername(authentication.getName());
        log.setAction(request.getMethod() + " /api/admin/" + relative);
        log.setResourceType(segments.length > 0 ? segments[0] : "admin");
        log.setResourceId(segments.length > 1 ? segments[1] : null);
        log.setIpAddress(clientIp(request));
        auditLogs.save(log);
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        String value = forwarded == null || forwarded.isBlank() ? request.getRemoteAddr() : forwarded.split(",")[0].trim();
        return value == null ? null : value.substring(0, Math.min(value.length(), 64));
    }
}