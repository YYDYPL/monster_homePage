package com.monster.homepage.content;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="contact_messages")
public class ContactMessage {
    @Id private UUID id;
    @Column(nullable=false, length=120) private String name;
    @Column(nullable=false, length=180) private String email;
    @Column(nullable=false, length=180) private String subject;
    @Column(nullable=false, columnDefinition="TEXT") private String message;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20) private MessageStatus status = MessageStatus.NEW;
    @Column(name="created_at", nullable=false) private Instant createdAt;
    @PrePersist void onCreate(){ if(id==null) id=UUID.randomUUID(); createdAt=Instant.now(); }
    public enum MessageStatus { NEW, READ, ARCHIVED }
    public UUID getId(){return id;} public String getName(){return name;} public void setName(String v){name=v;} public String getEmail(){return email;} public void setEmail(String v){email=v;}
    public String getSubject(){return subject;} public void setSubject(String v){subject=v;} public String getMessage(){return message;} public void setMessage(String v){message=v;} public MessageStatus getStatus(){return status;} public void setStatus(MessageStatus v){status=v;} public Instant getCreatedAt(){return createdAt;}
}
