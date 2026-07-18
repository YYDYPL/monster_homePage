package com.monster.homepage.content;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface PageViewRepository extends JpaRepository<PageView, Long> {
    long countByViewedAtGreaterThanEqual(Instant since);

    boolean existsByPathAndVisitorHashAndViewedAtBetween(String path, String visitorHash, Instant start, Instant end);

    @Query(value = "SELECT COUNT(DISTINCT visitor_hash) FROM page_views WHERE viewed_at >= :since", nativeQuery = true)
    long countUniqueVisitorsSince(@Param("since") Instant since);

    @Query(value = "SELECT path AS path, COUNT(*) AS views FROM page_views WHERE viewed_at >= :since GROUP BY path ORDER BY views DESC", nativeQuery = true)
    List<TopPathProjection> findTopPaths(@Param("since") Instant since, Pageable pageable);

    @Query(value = "SELECT to_char(date_trunc('day', viewed_at AT TIME ZONE 'Asia/Shanghai'), 'YYYY-MM-DD') AS day, COUNT(*) AS views FROM page_views WHERE viewed_at >= :since GROUP BY 1 ORDER BY 1", nativeQuery = true)
    List<DailyViewProjection> findDailyViews(@Param("since") Instant since);

    interface TopPathProjection {
        String getPath();
        long getViews();
    }

    interface DailyViewProjection {
        String getDay();
        long getViews();
    }
}
