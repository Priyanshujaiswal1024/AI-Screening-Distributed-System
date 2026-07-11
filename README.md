# TalentCloud AI Microservices Platform

![Microservices Architecture](https://img.shields.io/badge/Architecture-Microservices-blue)
![Spring Boot](https://img.shields.io/badge/Backend-Spring%20Boot%203.4-brightgreen)
![React](https://img.shields.io/badge/Frontend-React%2018-blue)
![AWS](https://img.shields.io/badge/Deployment-AWS%20EC2-orange)

> ⚠️ **Note to Recruiters (AWS Cost Optimization Strategy)** 
> 
> This application uses a heavy Microservices Architecture (8 Services + Kafka + PostgreSQL + AI LLMs). To optimize cloud costs on AWS EC2, the backend services are kept in a **stopped state** when not actively being demonstrated. 
> 
> If the live demo is unresponsive, please refer to the architecture diagrams and code in this repository, or feel free to contact me to instantly spin up the server for a live demonstration!

## Overview
TalentCloud is a highly scalable, AI-powered recruitment platform built using a modern **Event-Driven Microservices Architecture**. It leverages Large Language Models (LLMs) to automatically screen resumes, rank candidates, and provide intelligent chatbot assistance for recruiters.

## Key Services
- **AI Screening Service:** Uses Groq API (Llama-3.1) and Local Embeddings (Ollama/pgvector) to parse and evaluate candidate resumes against job descriptions.
- **Candidate Ranking Service:** Ranks applicants using complex matching algorithms and AI confidence scores.
- **Interview Scheduling Service:** Manages calendar events and sends automated email invites.
- **Recruiter Chat Service:** AI Chatbot for recruiters to query candidate data in natural language.
- **API Gateway & Eureka:** Centralized routing, authentication, and service discovery.
- **Notification Service:** Kafka-driven asynchronous email processing.

## Tech Stack
- **Backend:** Java 21, Spring Boot, Spring Cloud, Spring AI, Hibernate/JPA
- **Frontend:** React, Tailwind CSS, Vite, Zustand
- **Messaging:** Apache Kafka
- **Database:** PostgreSQL (with pgvector for AI semantic search)
- **Deployment:** Docker, Docker Compose, AWS EC2 (t3.large)
