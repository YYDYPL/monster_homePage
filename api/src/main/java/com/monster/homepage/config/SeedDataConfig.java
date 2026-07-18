package com.monster.homepage.config;

import com.monster.homepage.auth.AdminUser;
import com.monster.homepage.auth.AdminUserRepository;
import com.monster.homepage.content.ContentStatus;
import com.monster.homepage.content.Note;
import com.monster.homepage.content.NoteRepository;
import com.monster.homepage.content.Post;
import com.monster.homepage.content.PostRepository;
import com.monster.homepage.content.Project;
import com.monster.homepage.content.ProjectRepository;
import com.monster.homepage.content.ProjectStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.LocalDate;

@Configuration
public class SeedDataConfig {
    @Bean
    CommandLineRunner seedData(AdminUserRepository admins, PostRepository posts, NoteRepository notes, ProjectRepository projects,
                               PasswordEncoder encoder, @Value("${app.seed-data:true}") boolean enabled,
                               @Value("${app.admin.username:admin}") String username, @Value("${app.admin.password:}") String password) {
        return args -> {
            if (!enabled) return;
            if (admins.findByUsername(username).isEmpty() && password != null && !password.isBlank()) {
                AdminUser admin = new AdminUser();
                admin.setUsername(username);
                admin.setPasswordHash(encoder.encode(password));
                admin.setRole("ADMIN");
                admins.save(admin);
            }
            if (posts.count() == 0) {
                Post p = new Post();
                p.setTitle("欢迎来到我的技术空间"); p.setSlug("welcome-to-my-technical-space");
                p.setSummary("这是一个用于记录计算机学习、项目实践和技术思考的个人网站。");
                p.setContent("# 欢迎\n\n这里将持续记录 Java、Spring、数据库、前端和 DevOps 相关内容。\n\n你可以登录后台创建自己的文章。");
                p.setTagsCsv("个人网站,随笔"); p.setStatus(ContentStatus.PUBLISHED); p.setFeatured(true); p.setPublishedAt(Instant.now());
                posts.save(p);
            }
            if (notes.count() == 0) {
                Note n = new Note();
                n.setTitle("Java 学习路线"); n.setSlug("java-learning-roadmap");
                n.setSummary("从语言基础、并发、JVM 到 Spring 生态的学习记录。");
                n.setContent("# Java 学习路线\n\n- Java 基础与集合\n- 并发编程\n- JVM 原理\n- Spring Boot\n- 数据库与 DevOps");
                n.setCategory("Java"); n.setTagsCsv("Java,学习路线"); n.setStatus(ContentStatus.PUBLISHED); n.setPublishedAt(Instant.now());
                notes.save(n);
            }
            if (projects.count() == 0) {
                Project p = new Project();
                p.setName("Monster HomePage"); p.setSlug("monster-homepage");
                p.setSummary("一个基于 Next.js、Spring Boot 和 PostgreSQL 的个人技术网站。");
                p.setDescription("从个人品牌、技术博客、知识库到在线实验室，统一管理和展示个人技术资产。");
                p.setTechStackCsv("Java,Spring Boot,Next.js,PostgreSQL,Docker"); p.setStatus(ProjectStatus.ACTIVE); p.setFeatured(true); p.setStartDate(LocalDate.now());
                projects.save(p);
            }
        };
    }
}
