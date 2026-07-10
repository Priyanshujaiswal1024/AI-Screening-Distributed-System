package com.talent.platform.candidaterankingservice.messaging;

import com.talent.platform.candidaterankingservice.service.IdempotencyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.UUID;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class IdempotencyAspect {

    private final IdempotencyService idempotencyService;

    @Around("@annotation(idempotentConsumer)")
    public Object handleIdempotency(ProceedingJoinPoint joinPoint, IdempotentConsumer idempotentConsumer) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        Object[] args = joinPoint.getArgs();

        String eventId = null;
        Parameter[] parameters = method.getParameters();
        for (int i = 0; i < parameters.length; i++) {
            Header headerAnn = parameters[i].getAnnotation(Header.class);
            if (headerAnn != null && ("event-id".equals(headerAnn.value()) || "event-id".equals(headerAnn.name()))) {
                if (args[i] != null) {
                    eventId = args[i].toString();
                }
                break;
            }
        }

        if (eventId == null || eventId.isBlank()) {
            log.warn("[Idempotency] No 'event-id' header found in method {}. Generating fallback UUID.", method.getName());
            eventId = UUID.randomUUID().toString();
        }

        if (idempotencyService.isProcessed(eventId)) {
            log.warn("[Idempotency] Duplicate event detected (eventId={}). Skipping execution.", eventId);
            return null; // Skip execution
        }

        // Proceed with original execution
        Object result = joinPoint.proceed();

        // Mark as processed in same transaction
        idempotencyService.markProcessed(eventId, idempotentConsumer.topic());
        log.info("[Idempotency] Successfully processed eventId={} for topic={}", eventId, idempotentConsumer.topic());

        return result;
    }
}
