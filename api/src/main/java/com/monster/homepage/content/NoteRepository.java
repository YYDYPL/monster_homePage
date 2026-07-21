package com.monster.homepage.content;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NoteRepository extends JpaRepository<Note, UUID> {
    Optional<Note> findBySlugAndStatus(String slug, ContentStatus status);
    Page<Note> findAllByStatus(ContentStatus status, Pageable pageable);
    boolean existsBySlug(String slug);
    boolean existsBySlugAndIdNot(String slug, UUID id);
    List<Note> findAllByStatusOrderBySortOrderAscTitleAsc(ContentStatus status);
    List<Note> findAllByOrderBySortOrderAscTitleAsc();
    List<Note> findAllByParentIdOrderBySortOrderAscTitleAsc(UUID parentId);
    List<Note> findAllByParentIdIsNullOrderBySortOrderAscTitleAsc();
    long countByParentId(UUID parentId);

    @Query("select n from Note n where n.status = :status and (lower(n.title) like lower(concat('%', :q, '%')) or lower(coalesce(n.summary, '')) like lower(concat('%', :q, '%')) or lower(n.content) like lower(concat('%', :q, '%'))) order by n.publishedAt desc")
    List<Note> search(@Param("q") String q, @Param("status") ContentStatus status, Pageable pageable);
}