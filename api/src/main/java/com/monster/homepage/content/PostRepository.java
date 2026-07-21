package com.monster.homepage.content;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PostRepository extends JpaRepository<Post, UUID> {
    Optional<Post> findBySlugAndStatus(String slug, ContentStatus status);
    Page<Post> findAllByStatus(ContentStatus status, Pageable pageable);
    @org.springframework.data.jpa.repository.Query("select p from Post p where p.status = :status and (lower(p.tagsCsv) = lower(:tag) or lower(p.tagsCsv) like lower(concat(:tag, ',%')) or lower(p.tagsCsv) like lower(concat('%,', :tag)) or lower(p.tagsCsv) like lower(concat('%,', :tag, ',%')))" )
    Page<Post> findAllByStatusAndTag(@Param("status") ContentStatus status, @Param("tag") String tag, Pageable pageable);
    boolean existsByCoverImageUrl(String coverImageUrl);
    boolean existsBySlug(String slug);
    boolean existsBySlugAndIdNot(String slug, UUID id);
    @Query("select p.tagsCsv from Post p where p.status = :status and p.tagsCsv is not null")
    List<String> findTagsCsvByStatusAndTagsCsvIsNotNull(@Param("status") ContentStatus status);
    @Query("select p from Post p where p.status = :status and (lower(p.title) like lower(concat('%', :q, '%')) or lower(coalesce(p.summary, '')) like lower(concat('%', :q, '%')) or lower(p.content) like lower(concat('%', :q, '%'))) order by p.publishedAt desc")
    List<Post> search(@Param("q") String q, @Param("status") ContentStatus status, Pageable pageable);
}
