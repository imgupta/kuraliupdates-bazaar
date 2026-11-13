package com.kuraliupdates.bazaar.exception;

import com.kuraliupdates.bazaar.dto.api.ErrorResponse;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApi(ApiException ex) {
        return ResponseEntity.status(ex.getStatus())
                .body(ErrorResponse.of(ex.getMessage(), ex.getStatus().name()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest().body(ErrorResponse.of(message, "VALIDATION_ERROR"));
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ErrorResponse> handleMethodValidation(HandlerMethodValidationException ex) {
        return ResponseEntity.badRequest().body(ErrorResponse.of(ex.getMessage(), "VALIDATION_ERROR"));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraint(ConstraintViolationException ex) {
        return ResponseEntity.badRequest().body(ErrorResponse.of(ex.getMessage(), "VALIDATION_ERROR"));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleMalformedRequest(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body(ErrorResponse.of("Request body is invalid", "INVALID_REQUEST"));
    }

    /**
     * A caller may disconnect while a response is being written (for example,
     * when a bounded smoke probe times out). Spring wraps that condition in
     * AsyncRequestNotUsableException. The response is no longer writable, so
     * do not attempt to serialize a second error body or report it as a 500.
     */
    @ExceptionHandler(AsyncRequestNotUsableException.class)
    public void handleClientAbort(AsyncRequestNotUsableException ex) {
        log.debug("Client disconnected before the API response completed.");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unhandled API exception: {}", rootMessage(ex), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of("An unexpected server error occurred. Please retry.", "INTERNAL_ERROR"));
    }

    private String rootMessage(Throwable ex) {
        Throwable current = ex;
        while (current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        return current.getMessage() == null ? current.getClass().getSimpleName() : current.getMessage();
    }
}
