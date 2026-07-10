package com.talent.platform.usermanagementservice.repository;

import com.talent.platform.usermanagementservice.model.Recruiter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RecruiterRepository extends JpaRepository<Recruiter, UUID> {
    Optional<Recruiter> findByEmail(String email);
    boolean existsByEmail(String email);
}