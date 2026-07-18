package com.monster.homepage.content;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    java.util.Optional<Project> findBySlug(String slug);
    Page<Project> findAllByOrderByFeaturedDescCreatedAtDesc(Pageable pageable);
    boolean existsByImageUrl(String imageUrl);
    @Query("select p from Project p where lower(p.name) like lower(concat('%', :q, '%')) or lower(coalesce(p.summary, '')) like lower(concat('%', :q, '%')) or lower(coalesce(p.description, '')) like lower(concat('%', :q, '%')) order by p.createdAt desc")
    List<Project> search(@Param("q") String q, Pageable pageable);
}

