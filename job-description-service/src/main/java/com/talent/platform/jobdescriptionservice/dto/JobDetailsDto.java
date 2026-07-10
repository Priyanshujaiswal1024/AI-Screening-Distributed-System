package com.talent.platform.jobdescriptionservice.dto;

import java.util.List;
import java.util.UUID;

/**
 * FIX: Was an inner record of InternalJobDescriptionController.
 *      InternalJobService had a commented-out import pointing to the controller —
 *      COMPILE ERROR because the import was disabled.
 *      Moved to standalone dto. Both controller and service import from here.
 */
public record JobDetailsDto(UUID jobId, String title, List<String> requiredSkills) {}