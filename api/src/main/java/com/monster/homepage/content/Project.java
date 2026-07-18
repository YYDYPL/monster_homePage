package com.monster.homepage.content;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity @Table(name = "projects")
public class Project {
    @Id private UUID id;
    @Column(nullable=false, length=180) private String name;
    @Column(nullable=false, unique=true, length=180) private String slug;
    @Column(length=500) private String summary;
    @Column(columnDefinition="TEXT") private String description;
    @Column(name="tech_stack_csv", length=1000) private String techStackCsv;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20) private ProjectStatus status = ProjectStatus.EXPERIMENTAL;
    @Column(name="repo_url", length=500) private String repoUrl;
    @Column(name="demo_url", length=500) private String demoUrl;
    @Column(name="image_url", length=500) private String imageUrl;
    @Column(nullable=false) private boolean featured;
    @Column(name="start_date") private LocalDate startDate;
    @Column(name="end_date") private LocalDate endDate;
    @Column(name="created_at", nullable=false) private Instant createdAt;
    @Column(name="updated_at", nullable=false) private Instant updatedAt;
    @PrePersist void onCreate(){ if(id==null) id=UUID.randomUUID(); Instant now=Instant.now(); createdAt=now; updatedAt=now; }
    @PreUpdate void onUpdate(){ updatedAt=Instant.now(); }
    public UUID getId(){return id;} public String getName(){return name;} public void setName(String v){name=v;} public String getSlug(){return slug;} public void setSlug(String v){slug=v;}
    public String getSummary(){return summary;} public void setSummary(String v){summary=v;} public String getDescription(){return description;} public void setDescription(String v){description=v;}
    public String getTechStackCsv(){return techStackCsv;} public void setTechStackCsv(String v){techStackCsv=v;} public ProjectStatus getStatus(){return status;} public void setStatus(ProjectStatus v){status=v;}
    public String getRepoUrl(){return repoUrl;} public void setRepoUrl(String v){repoUrl=v;} public String getDemoUrl(){return demoUrl;} public void setDemoUrl(String v){demoUrl=v;} public String getImageUrl(){return imageUrl;} public void setImageUrl(String v){imageUrl=v;}
    public boolean isFeatured(){return featured;} public void setFeatured(boolean v){featured=v;} public LocalDate getStartDate(){return startDate;} public void setStartDate(LocalDate v){startDate=v;} public LocalDate getEndDate(){return endDate;} public void setEndDate(LocalDate v){endDate=v;}
    public Instant getCreatedAt(){return createdAt;} public Instant getUpdatedAt(){return updatedAt;}
}
