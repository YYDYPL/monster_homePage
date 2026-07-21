package com.monster.homepage.content;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface PageViewRepository extends JpaRepository<PageView, Long> {
    long countByViewedAtBetween(Instant start, Instant end);

    @Query(value = "SELECT COUNT(DISTINCT visitor_hash) FROM page_views WHERE viewed_at >= :start AND viewed_at < :end", nativeQuery = true)
    long countUniqueVisitorsBetween(@Param("start") Instant start, @Param("end") Instant end);

    @Query(value = "SELECT COUNT(DISTINCT COALESCE(ip_hash, visitor_hash)) FROM page_views WHERE viewed_at >= :start AND viewed_at < :end", nativeQuery = true)
    long countUniqueIpsBetween(@Param("start") Instant start, @Param("end") Instant end);

    @Query(value = "SELECT path AS path, COUNT(*) AS views FROM page_views WHERE viewed_at >= :start AND viewed_at < :end GROUP BY path ORDER BY views DESC", nativeQuery = true)
    List<TopPathProjection> findTopPaths(@Param("start") Instant start, @Param("end") Instant end);

    @Query(value = "SELECT to_char(date_trunc('day', viewed_at AT TIME ZONE 'Asia/Shanghai'), 'YYYY-MM-DD') AS period, COUNT(*) AS pv, COUNT(DISTINCT visitor_hash) AS uv, COUNT(DISTINCT COALESCE(ip_hash, visitor_hash)) AS uip FROM page_views WHERE viewed_at >= :start AND viewed_at < :end GROUP BY 1 ORDER BY 1", nativeQuery = true)
    List<AnalyticsPointProjection> findDailyMetrics(@Param("start") Instant start, @Param("end") Instant end);

    @Query(value = "SELECT CASE WHEN NULLIF(BTRIM(region), '') IS NULL OR REPLACE(region, '?', '') = '' THEN CHR(26410) || CHR(30693) ELSE region END AS name, COUNT(*) AS pv, COUNT(DISTINCT visitor_hash) AS uv, COUNT(DISTINCT COALESCE(ip_hash, visitor_hash)) AS uip FROM page_views WHERE viewed_at >= :start AND viewed_at < :end GROUP BY 1 ORDER BY pv DESC", nativeQuery = true)
    List<DimensionProjection> findRegionMetrics(@Param("start") Instant start, @Param("end") Instant end);

    @Query(value = "SELECT CASE WHEN NULLIF(BTRIM(browser), '') IS NULL OR REPLACE(browser, '?', '') = '' THEN CHR(26410) || CHR(30693) ELSE browser END AS name, COUNT(*) AS pv, COUNT(DISTINCT visitor_hash) AS uv, COUNT(DISTINCT COALESCE(ip_hash, visitor_hash)) AS uip FROM page_views WHERE viewed_at >= :start AND viewed_at < :end GROUP BY 1 ORDER BY pv DESC", nativeQuery = true)
    List<DimensionProjection> findBrowserMetrics(@Param("start") Instant start, @Param("end") Instant end);

    @Query(value = "SELECT CASE WHEN NULLIF(BTRIM(device), '') IS NULL OR REPLACE(device, '?', '') = '' THEN CHR(26410) || CHR(30693) ELSE device END AS name, COUNT(*) AS pv, COUNT(DISTINCT visitor_hash) AS uv, COUNT(DISTINCT COALESCE(ip_hash, visitor_hash)) AS uip FROM page_views WHERE viewed_at >= :start AND viewed_at < :end GROUP BY 1 ORDER BY pv DESC", nativeQuery = true)
    List<DimensionProjection> findDeviceMetrics(@Param("start") Instant start, @Param("end") Instant end);

    @Query(value = "SELECT CASE WHEN NULLIF(BTRIM(network), '') IS NULL OR REPLACE(network, '?', '') = '' THEN CHR(26410) || CHR(30693) ELSE network END AS name, COUNT(*) AS pv, COUNT(DISTINCT visitor_hash) AS uv, COUNT(DISTINCT COALESCE(ip_hash, visitor_hash)) AS uip FROM page_views WHERE viewed_at >= :start AND viewed_at < :end GROUP BY 1 ORDER BY pv DESC", nativeQuery = true)
    List<DimensionProjection> findNetworkMetrics(@Param("start") Instant start, @Param("end") Instant end);

    interface TopPathProjection {
        String getPath();
        long getViews();
    }

    interface AnalyticsPointProjection {
        String getPeriod();
        long getPv();
        long getUv();
        long getUip();
    }

    interface DimensionProjection {
        String getName();
        long getPv();
        long getUv();
        long getUip();
    }
}
