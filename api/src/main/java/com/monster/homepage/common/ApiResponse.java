package com.monster.homepage.common;

public record ApiResponse<T>(boolean success, T data, ApiError error, String traceId) {
    public static <T> ApiResponse<T> ok(T data) { return new ApiResponse<>(true, data, null, null); }
    public static <T> ApiResponse<T> error(String code, String message, String traceId) { return new ApiResponse<>(false, null, new ApiError(code, message, null), traceId); }
    public static <T> ApiResponse<T> error(String code, String message, Object fields, String traceId) { return new ApiResponse<>(false, null, new ApiError(code, message, fields), traceId); }
    public record ApiError(String code, String message, Object fields) {}
}
