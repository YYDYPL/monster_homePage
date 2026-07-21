package com.monster.homepage.content;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class PageViewService {
    private static final ZoneId SITE_ZONE = ZoneId.of("Asia/Shanghai");
    private final PageViewRepository repository;
    private final String salt;

    public PageViewService(PageViewRepository repository, @Value("${app.analytics.salt:change-me-in-production}") String salt) {
        this.repository = repository;
        this.salt = salt;
    }

    /** Record every valid navigation as one PV. UV/UIP are calculated from the pseudonymous hashes in the report queries. */
    @Transactional
    public boolean record(OperationsDtos.PageViewRequest metadata, HttpServletRequest request) {
        String path = normalizePath(metadata.path());
        if (path == null) return false;

        String ip = clientIp(request);
        String userAgent = valueOrEmpty(request.getHeader("User-Agent"));
        String visitorId = normalize(metadata.visitorId());
        String visitorSource = visitorId == null ? ip + "|" + userAgent : visitorId;

        PageView view = new PageView();
        view.setPath(path);
        view.setVisitorHash(hashStable("visitor|" + visitorSource));
        view.setIpHash(hashStable("ip|" + ip));
        view.setBrowser(resolveBrowser(userAgent));
        view.setDevice(resolveDevice(userAgent));
        view.setNetwork(resolveNetwork(metadata, request));
        view.setRegion(resolveRegion(metadata, request));
        repository.save(view);
        return true;
    }

    public OperationsDtos.AnalyticsSummary summary(int requestedDays) {
        int days = Math.min(Math.max(requestedDays, 1), 365);
        ZonedDateTime now = ZonedDateTime.now(SITE_ZONE);
        LocalDate endDate = now.toLocalDate();
        LocalDate startDate = endDate.minusDays(days - 1L);
        Instant end = now.toInstant();
        Instant start = startDate.atStartOfDay(SITE_ZONE).toInstant();
        Instant todayStart = endDate.atStartOfDay(SITE_ZONE).toInstant();
        OperationsDtos.AnalyticsMetric totals = metric(start, end);
        OperationsDtos.AnalyticsMetric today = metric(todayStart, end);

        List<OperationsDtos.AnalyticsPoint> timeline = timeline(startDate, endDate, start, end);
        List<OperationsDtos.PathMetric> topPaths = repository.findTopPaths(start, end).stream()
                .limit(12)
                .map(item -> new OperationsDtos.PathMetric(item.getPath(), item.getViews()))
                .toList();

        return new OperationsDtos.AnalyticsSummary(
                startDate.toString(),
                endDate.toString(),
                days,
                totals,
                today,
                timeline,
                topPaths,
                dimensions(repository.findRegionMetrics(start, end)),
                dimensions(repository.findBrowserMetrics(start, end)),
                dimensions(repository.findDeviceMetrics(start, end)),
                dimensions(repository.findNetworkMetrics(start, end))
        );
    }

    private List<OperationsDtos.AnalyticsPoint> timeline(LocalDate startDate, LocalDate endDate, Instant start, Instant end) {
        Map<String, PageViewRepository.AnalyticsPointProjection> metricsByDay = new HashMap<>();
        repository.findDailyMetrics(start, end).forEach(item -> metricsByDay.put(item.getPeriod(), item));

        List<OperationsDtos.AnalyticsPoint> result = new ArrayList<>();
        for (LocalDate day = startDate; !day.isAfter(endDate); day = day.plusDays(1)) {
            String period = day.toString();
            PageViewRepository.AnalyticsPointProjection item = metricsByDay.get(period);
            result.add(item == null
                    ? new OperationsDtos.AnalyticsPoint(period, 0, 0, 0)
                    : new OperationsDtos.AnalyticsPoint(period, item.getPv(), item.getUv(), item.getUip()));
        }
        return result;
    }

    private OperationsDtos.AnalyticsMetric metric(Instant start, Instant end) {
        return new OperationsDtos.AnalyticsMetric(
                repository.countByViewedAtBetween(start, end),
                repository.countUniqueVisitorsBetween(start, end),
                repository.countUniqueIpsBetween(start, end)
        );
    }

    private List<OperationsDtos.AnalyticsDimension> dimensions(List<PageViewRepository.DimensionProjection> source) {
        return source.stream()
                .limit(10)
                .map(item -> new OperationsDtos.AnalyticsDimension(displayDimension(item.getName()), item.getPv(), item.getUv(), item.getUip()))
                .toList();
    }

    private String displayDimension(String value) {
        if (value == null || value.isBlank() || value.replace("?", "").isBlank()) return "\u672a\u77e5";
        return value;
    }

    private String normalizePath(String rawPath) {
        if (rawPath == null || rawPath.isBlank() || !rawPath.startsWith("/") || rawPath.length() > 500) return null;
        String path = rawPath.split("[?#]", 2)[0];
        if (path.startsWith("/admin") || path.startsWith("/api") || path.startsWith("/_next")) return null;
        return path;
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = firstHeader(request, "CF-Connecting-IP", "X-Real-IP", "X-Forwarded-For");
        return forwarded == null ? valueOrEmpty(request.getRemoteAddr()) : forwarded.split(",", 2)[0].trim();
    }

    private String resolveRegion(OperationsDtos.PageViewRequest metadata, HttpServletRequest request) {
        String proxyRegion = firstHeader(request, "CF-IPCountry", "X-Country-Code", "X-Geo-Country", "X-Geo-Region", "X-Region");
        if (proxyRegion != null) return proxyRegion;
        String locale = normalize(metadata.locale());
        if (locale != null) {
            int separator = Math.max(locale.indexOf('-'), locale.indexOf('_'));
            if (separator > 0 && separator < locale.length() - 1) return locale.substring(separator + 1).toUpperCase(Locale.ROOT);
        }
        return "\u672a\u77e5";
    }

    private String resolveNetwork(OperationsDtos.PageViewRequest metadata, HttpServletRequest request) {
        String network = normalize(metadata.networkType());
        if (network == null) network = firstHeader(request, "X-Network-Type", "X-Connection-Type");
        return network == null ? "\u672a\u77e5" : network.toLowerCase(Locale.ROOT);
    }

    private String resolveBrowser(String userAgent) {
        String ua = userAgent.toLowerCase(Locale.ROOT);
        if (ua.contains("edg/") || ua.contains("edge/")) return "Edge";
        if (ua.contains("opr/") || ua.contains("opera")) return "Opera";
        if (ua.contains("samsungbrowser")) return "Samsung Internet";
        if (ua.contains("firefox") || ua.contains("fxios")) return "Firefox";
        if (ua.contains("chrome") || ua.contains("crios")) return "Chrome";
        if (ua.contains("safari")) return "Safari";
        if (ua.contains("msie") || ua.contains("trident/")) return "IE";
        return "\u5176\u4ed6";
    }

    private String resolveDevice(String userAgent) {
        String ua = userAgent.toLowerCase(Locale.ROOT);
        if (ua.contains("ipad") || ua.contains("tablet") || ua.contains("sm-t")) return "\u5e73\u677f";
        if (ua.contains("mobile") || ua.contains("android") || ua.contains("iphone") || ua.contains("ipod")) return "\u624b\u673a";
        return "\u684c\u9762\u7aef";
    }

    private String firstHeader(HttpServletRequest request, String... names) {
        for (String name : names) {
            String value = normalize(request.getHeader(name));
            if (value != null) return value;
        }
        return null;
    }

    private String normalize(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized.length() > 120 ? normalized.substring(0, 120) : normalized;
    }

    private String valueOrEmpty(String value) { return value == null ? "" : value; }

    private String hashStable(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest((salt + "|" + value).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 unavailable", exception);
        }
    }
}
