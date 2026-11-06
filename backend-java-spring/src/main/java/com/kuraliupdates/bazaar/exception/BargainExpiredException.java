package com.kuraliupdates.bazaar.exception;

import org.springframework.http.HttpStatus;

/**
 * Signals an expired bargain after its EXPIRED state has been committed.
 */
public class BargainExpiredException extends ApiException {
    public BargainExpiredException() {
        super(HttpStatus.CONFLICT, "This bargain has expired. The catalogue price applies.");
    }
}
