package com.monster.homepage.content;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "posts")
public class Post {
    @Id private UUID id;
    @Column(nullable=false, length=180) private String title;
    @Column(nullable=false, unique=true, length=180) private String slug;
    @Column(columnDefinition="TEXT") private String summary;
    @Column(nullable=false, columnDefinition="TEXT") private String content;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20) private ContentStatus status = ContentStatus.DRAFT;
    @Column(name="cover_image_url", length=500) private String coverImageUrl;
    @Column(name="tags_csv", columnDefinition="TEXT") private String tagsCsv;
    @Column(length=120) private String series;
    @Column(nullable=false) private boolean featured;
    @Column(name="published_at") private Instant publishedAt;
    @Column(name="created_at", nullable=false) private Instant createdAt;
    @Column(name="updated_at", nullable=false) private Instant updatedAt;
    @PrePersist void onCreate(){ if(id==null) id=UUID.randomUUID(); Instant now=Instant.now(); createdAt=now; updatedAt=now; }
    @PreUpdate void onUpdate(){ updatedAt=Instant.now(); }
    public UUID getId(){return id;} public String getTitle(){return title;} public void setTitle(String v){title=v;}
    public String getSlug(){return slug;} public void setSlug(String v){slug=v;} public String getSummary(){return summary;} public void setSummary(String v){summary=v;}
    public String getContent(){return content;} public void setContent(String v){content=v;} public ContentStatus getStatus(){return status;} public void setStatus(ContentStatus v){status=v;}
    public String getCoverImageUrl(){return coverImageUrl;} public void setCoverImageUrl(String v){coverImageUrl=v;} public String getTagsCsv(){return tagsCsv;} public void setTagsCsv(String v){tagsCsv=v;}
    public String getSeries(){return series;} public void setSeries(String v){series=v;} public boolean isFeatured(){return featured;} public void setFeatured(boolean v){featured=v;}
    public Instant getPublishedAt(){return publishedAt;} public void setPublishedAt(Instant v){publishedAt=v;} public Instant getCreatedAt(){return createdAt;} public Instant getUpdatedAt(){return updatedAt;}
}
