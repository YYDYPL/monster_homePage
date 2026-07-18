package com.monster.homepage.content;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.HexFormat;

@Service
public class PageViewService {
    private static final ZoneId SITE_ZONE = ZoneId.of("Asia/Shanghai");
    private final PageViewRepository repository;
    private final String salt;

    public PageViewService(PageViewRepository repository, @Value("${app.analytics.salt:change-me-in-production}") String salt) {
        this.repository = repository;
        this.salt = salt;
    }

    @Transactional
    public boolean record(String rawPath, HttpServletRequest request) {
        String path = normalizePath(rawPath);
        if (path == null) return false;
        ZonedDateTime now = ZonedDateTime.now(SITE_ZONE);
        Instant start = now.toLocalDate().atStartOfDay(SITE_ZONE).toInstant();
        Instant end = start.plus(Duration.ofDays(1));
        String visitorHash = hashVisitor(request, now.toLocalDate());
        if (repository.existsByPathAndVisitorHashAndViewedAtBetween(path, visitorHash, start, end)) return false;
        PageView view = new PageView();
        view.setPath(path);
        view.setVisitorHash(visitorHash);
        repository.save(view);
        return true;
    }

    public OperationsDtos.AnalyticsSummary summary(int requestedDays) {
        int days = Math.min(Math.max(requestedDays, 7), 90);
        Instant now = Instant.now();
        Instant today = LocalDate.now(SITE_ZONE).atStartOfDay(SITE_ZONE).toInstant();
        Instant sevenDays = now.minus(Duration.ofDays(7));
        Instant thirtyDays = now.minus(Duration.ofDays(30));
        Instant chartSince = now.minus(Duration.ofDays(days));
        var daily = repository.findDailyViews(chartSince).stream()
                .map(item -> new OperationsDtos.DailyMetric(item.getDay(), item.getViews())).toList();
        var topPaths = repository.findTopPaths(chartSince, PageRequest.of(0, 10)).stream()
                .map(item -> new OperationsDtos.PathMetric(item.getPath(), item.getViews())).toList();
        return new OperationsDtos.AnalyticsSummary(
                repository.count(),
                repository.countByViewedAtGreaterThanEqual(today),
                repository.countByViewedAtGreaterThanEqual(sevenDays),
                repository.countByViewedAtGreaterThanEqual(thirtyDays),
                repository.countUniqueVisitorsSince(thirtyDays),
                daily,
                topPaths
        );
    }

    private String normalizePath(String rawPath) {
        if (rawPath == null || rawPath.isBlank() || !rawPath.startsWith("/") || rawPath.length() > 500) return null;
        String path = rawPath.split("[?#]", 2)[0];
        if (path.startsWith("/admin") || path.startsWith("/api") || path.startsWith("/_next")) return null;
        return path;
    }

    private String hashVisitor(HttpServletRequest request, LocalDate day) {
        String forwarded = request.getHeader("X-Forwarded-For");
        String ip = forwarded == null || forwarded.isBlank() ? request.getRemoteAddr() : forwarded.split(",", 2)[0].trim();
        String userAgent = request.getHeader("User-Agent");
        String source = salt + '|' + day + '|' + ip + '|' + (userAgent == null ? "" : userAgent);
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(source.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 unavailable", exception);
        }
    }
}
