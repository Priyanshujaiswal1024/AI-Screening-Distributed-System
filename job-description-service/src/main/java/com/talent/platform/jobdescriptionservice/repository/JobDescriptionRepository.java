package com.talent.platform.jobdescriptionservice.repository;

import com.talent.platform.jobdescriptionservice.model.JobDescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JobDescriptionRepository extends JpaRepository<JobDescription, UUID> {
    List<JobDescription> findByRecruiterId(UUID recruiterId);
}
