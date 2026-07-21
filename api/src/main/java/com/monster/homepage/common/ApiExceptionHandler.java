package com.monster.homepage.common;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> validation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        Map<String, String> fields = new LinkedHashMap<>();
        for (FieldError error : exception.getBindingResult().getFieldErrors()) fields.put(error.getField(), error.getDefaultMessage());
        return ResponseEntity.badRequest().body(ApiResponse.error("VALIDATION_ERROR", "请求参数不合法", fields, UUID.randomUUID().toString()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> malformedRequest() {
        return ResponseEntity.badRequest().body(ApiResponse.error(
                "MALFORMED_REQUEST",
                "Request body contains invalid or unreadable content",
                UUID.randomUUID().toString()
        ));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> uploadTooLarge() {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(ApiResponse.error(
                "UPLOAD_TOO_LARGE",
                "上传文件过大，请压缩文件或调整服务器上传限制后重试",
                UUID.randomUUID().toString()
        ));
    }

    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<ApiResponse<Void>> multipartFailure(MultipartException exception) {
        return ResponseEntity.badRequest().body(ApiResponse.error(
                "MULTIPART_ERROR",
                "上传请求解析失败，请检查文件大小和网络连接后重试",
                UUID.randomUUID().toString()
        ));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> unsupportedMediaType() {
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(ApiResponse.error(
                "UNSUPPORTED_MEDIA_TYPE",
                "不支持的请求类型",
                UUID.randomUUID().toString()
        ));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> dataConflict() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(
                "DATA_CONFLICT",
                "The content conflicts with existing data or exceeds a field limit",
                UUID.randomUUID().toString()
        ));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ApiResponse<Void>> databaseUnavailable() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(ApiResponse.error(
                "DATABASE_UNAVAILABLE",
                "The content service is temporarily unavailable. Please retry later",
                UUID.randomUUID().toString()
        ));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<ApiResponse<Void>> notFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("NOT_FOUND", "资源不存在", UUID.randomUUID().toString()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> badRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(ApiResponse.error("BAD_REQUEST", exception.getMessage(), UUID.randomUUID().toString()));
    }
}
