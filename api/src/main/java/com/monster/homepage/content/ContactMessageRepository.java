package com.monster.homepage.content;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ContactMessageRepository extends JpaRepository<ContactMessage, UUID> {
    Page<ContactMessage> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<ContactMessage> findAllByStatus(ContactMessage.MessageStatus status, Pageable pageable);
    long countByStatus(ContactMessage.MessageStatus status);
}
