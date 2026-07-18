package com.monster.homepage.common;

import java.util.List;

public record PageResponse<T>(List<T> items, int page, int size, long total, int totalPages) {
    public static <T> PageResponse<T> from(org.springframework.data.domain.Page<T> page) {
        return new PageResponse<>(page.getContent(), page.getNumber() + 1, page.getSize(), page.getTotalElements(), page.getTotalPages());
    }
}
