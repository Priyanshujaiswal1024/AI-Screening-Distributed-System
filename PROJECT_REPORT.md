# ACADEMIC & TECHNICAL PROJECT REPORT

---

## 1. TOPIC
**Design and Implementation of an Enterprise-Grade Distributed AI Resume Screening and Hybrid Candidate Evaluation System using Spring Boot Microservices, Apache Kafka, and Semantic Vector Retrieval (TalentIQ)**

---

## 2. OBJECTIVE
The primary purpose of this study is to engineer a scalable, bias-free, and highly reliable automated recruitment screening platform that replaces labor-intensive, error-prone manual resume evaluation with intelligent, distributed computing and modern generative artificial intelligence.

The key objectives of this study are:
1. **Architect a Distributed Microservices Ecosystem:** Implement an 11-service decoupled architecture utilizing Java 21 and Spring Boot, orchestrated via Spring Cloud Gateway and Netflix Eureka for dynamic service registration, load balancing, and independent horizontal scaling.
2. **Develop an Asynchronous Event-Driven Ingestion Pipeline:** Implement Apache Kafka message brokers to handle high-throughput resume parsing (Apache Tika), AI screening, and notifications asynchronously without blocking client requests or causing server thread starvation.
3. **Mitigate Candidate "Keyword Stuffing" through Hybrid Evaluation:** Design and implement a dual-layer scoring engine that pairs deterministic skill-math verification (70% weight) with contextual semantic vector embeddings (30% weight) computed using Ollama (`nomic-embed-text`) and PostgreSQL `pgvector`.
4. **Enable Conversational Candidate Discovery via RAG:** Create an interactive Recruiter Chatbot powered by Retrieval-Augmented Generation (RAG) that retrieves candidate resume chunks by cosine similarity and feeds them to Large Language Models (LLMs) to answer specific qualitative recruiter queries in real time.
5. **Ensure Enterprise Fault Tolerance and Resiliency:** Integrate Resilience4j Circuit Breakers to guarantee zero downtime and graceful degradation (falling back to deterministic matching if AI inference services are unavailable) alongside a two-tier storage layer (AWS S3 with automatic local storage failover).

---

## 3. PROBLEM STATEMENT
In contemporary recruitment and talent acquisition, hiring teams are overwhelmed by an exponential volume of job applications. For popular corporate and technical roles, a single opening can attract hundreds or thousands of resumes within days. 

Manual evaluation of these documents presents critical challenges:
- **Human Inefficiency and Fatigue:** Human recruiters spend an average of only 6 to 8 seconds glancing at a resume, leading to oversight, missed talent, and high operational costs.
- **Unconscious Bias and Inconsistency:** Human screening is susceptible to subjective biases regarding academic prestige, gender, geography, or non-standard formatting.
- **Limitations of Legacy Applicant Tracking Systems (ATS):** Existing commercial ATS solutions rely heavily on crude, literal keyword matching (e.g., Boolean searches for specific strings). These legacy systems cannot interpret context, evaluate the depth of technical projects, or comprehend transferable technical competencies.
- **Architectural Bottlenecks:** Traditional monolithic recruitment applications fail under peak application bursts, crashing or timing out when processing compute-heavy PDF parsing and AI inference simultaneously.

---

## 4. PROBLEM TO BE SOLVED
The proposed study directly tackles several explicit technical and operational bottlenecks:

1. **The "Keyword Stuffing" Exploit:** Candidates frequently game keyword-based ATS algorithms by stuffing high-demand technologies (e.g., *Kubernetes, Kafka, AWS, Java*) into skills sections without possessing genuine project or production experience. Legacy systems award these candidates near-perfect match scores, displacing genuinely qualified candidates.
2. **Semantic and Contextual Blindness:** Traditional keyword search fails when candidates express qualifications using synonyms or practical descriptions rather than verbatim keywords (e.g., *"Engineered distributed message pipelines"* vs. *"Kafka specialist"*).
3. **High Latency and System Timeouts during Document Ingestion:** Parsing binary documents (PDFs, DOCX), extracting structured text, and computing high-dimensional vector embeddings are CPU- and memory-intensive. Synchronous execution results in HTTP connection timeouts and poor user experience.
4. **Cascading Microservice Outages & Third-Party LLM Dependencies:** Cloud LLMs and local embedding servers can experience rate-limiting, network jitter, or downtime. In tightly coupled architectures, an outage in the AI component paralyzes the entire recruitment portal.
5. **Storage Failure and Data Loss:** Network interruptions or misconfigurations with cloud storage buckets (e.g., AWS S3) can cause candidate resume loss during upload, creating data inconsistencies between candidate profiles and their parsed credentials.
6. **Time-Consuming Candidate Fact-Checking:** Recruiters spend excessive time opening and manually reading multi-page resumes to answer simple contextual questions (e.g., *"Has this candidate managed an on-call rotation?"* or *"What was their team size?"*).

---

## 5. PROPOSED SOLUTION
To solve these challenges, this study presents **TalentIQ**, an enterprise-grade distributed recruitment automation platform. The platform is designed around five core pillars:

### A. Modular 11-Microservices Architecture
The system is divided into single-responsibility, loosely coupled microservices:
- **`api-gateway` (Port 8090):** Centralized ingress, JWT authentication verification, rate-limiting, and routing.
- **`eureka-server` (Port 8761):** Dynamic service discovery ensuring automatic registration and health tracking of scaling instances.
- **`authentication-service` & `user-management-service`:** Secure role-based access control (RBAC) separating Candidate and Recruiter privileges with Redis-backed token validation.
- **`job-description-service`:** Structured management of technical prerequisites, required skills, and job criteria.
- **`resume-management-service`:** Secure document upload, Apache Tika text extraction, and resilient file storage.
- **`ai-screening-service`:** Document chunking, Ollama/Groq vector embedding generation (`nomic-embed-text`), PostgreSQL `pgvector` storage, and cosine distance evaluation.
- **`candidate-ranking-service`:** Execution of the hybrid scoring algorithm and maintenance of real-time candidate leaderboards in Redis Sorted Sets (`ZSET`).
- **`recruiter-chat-service`:** RAG query engine allowing conversational questions against candidate resume vectors.
- **`interview-scheduling-service` & `notification-service`:** Automated scheduling workflows and asynchronous email alerts via Kafka.

### B. Asynchronous Event-Driven Pipeline (Apache Kafka)
Instead of synchronous blocking calls, the application lifecycle follows a choreographed Saga pattern:
1. A candidate uploads a resume $\rightarrow$ `resume-management-service` streams a `resume.uploaded` event to Kafka.
2. Apache Tika extracts clean text $\rightarrow$ emits `resume.parsed`.
3. `ai-screening-service` consumes the parsed text, partitions it into chunks, generates vector embeddings, and stores them in PostgreSQL with `pgvector`.
4. `candidate-ranking-service` computes the final ranking against the active Job Description and publishes `candidate.ranked`.
5. `notification-service` asynchronously alerts the recruiter and candidate of the status update.

### C. Hybrid Candidate Scoring Engine
To overcome keyword stuffing, the system implements a composite evaluation model:

$$\text{Final Score} = \left(0.70 \times \text{Skill Math Score}\right) + \left(0.30 \times \text{Cosine Similarity} \times 100\right)$$

- **Deterministic Skill Math (70%):** Validates the mandatory keyword match percentage against hard requirements:
  $$\text{Skill Math} = \frac{\text{Matched Skills Count}}{\text{Required Skills Count}} \times 100$$
- **Semantic Vector Cosine Similarity (30%):** Measures contextual and conceptual alignment between the job description and the candidate's actual narrative:
  $$\text{Cosine Similarity} = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \|\mathbf{B}\|}$$
  Where $\mathbf{A}$ represents the Job Description embedding vector and $\mathbf{B}$ represents the Candidate's Resume chunk embedding vector.

*Impact:* A candidate who copies 10 keywords into their header but writes shallow, unrelated project experience will receive high skill math but very low cosine similarity ($\approx 0.30$), yielding an uncompetitive final score. Conversely, a genuine engineer with deep domain narratives achieves high similarity ($\approx 0.90$), prioritizing authentic competence over keyword manipulation.

### D. RAG-Powered Conversational Recruiter Chatbot
Recruiters do not need to manually read hundreds of pages. The `recruiter-chat-service` leverages Retrieval-Augmented Generation:
- Recruiter submits natural language questions: *"Does the candidate have production Kafka experience?"*
- The query is vectorized and compared against candidate resume chunks in `pgvector`.
- The most relevant chunks (top-K) are injected into the prompt context for the LLM.
- The LLM provides factual, hallucination-free summaries with direct citations to the resume text.

### E. Fault Tolerance, Dual-Tier Storage, and Circuit Breaking
- **Resilience4j Circuit Breaker:** Protects the system from AI service degradation. If Ollama or Groq encounters latency or crashes, the Circuit Breaker trips to `OPEN`, immediately executing a fallback that evaluates candidates via pure deterministic skill math with `aiScreened = false`, keeping the recruitment pipeline operational without dropping applications.
- **Two-Tier Resilient Storage:** Resumes default to AWS S3 (`talent-intelligence-resumes-2026`). If network partitions occur, the upload automatically routes to local resilient storage (`/tmp/talent_resumes`) and emits fallback streaming URLs, guaranteeing zero upload loss.

---

## 6. EXPECTED OUTCOME
Through the implementation and deployment of this proposed system, the study achieves the following concrete outcomes:

| Metric / Objective | Traditional Manual / Legacy ATS | Proposed TalentIQ System |
| :--- | :--- | :--- |
| **Average Screening Time** | 2 to 5 business days per batch | Under 30 seconds per application batch |
| **Vulnerability to Keyword Stuffing** | High (100% false-positive vulnerability) | Low (penalized by semantic cosine verification) |
| **System Availability under AI Failure** | System stalls or drops jobs | 100% operational via Circuit Breaker Fallback |
| **Recruiter Query Latency** | 10-15 minutes manual review per resume | Instant conversational answers via RAG Chatbot |
| **Scalability & Decoupling** | Monolith crashes during high traffic | Independently scalable microservices via Kafka |
| **Data Durability** | Single point of storage failure | Dual-tier AWS S3 + Local resilient fallback |

### Key Deliverables Achieved:
1. **Dramatic Efficiency Gains:** An estimated 85% to 90% reduction in recruitment cycle turnaround time, freeing HR professionals from repetitive manual filtering.
2. **Fair and Merit-Based Hiring:** Complete eradication of subjective human bias during initial screening, ensuring candidates are ranked purely on technical qualifications and validated semantic depth.
3. **Enterprise Robustness:** A resilient distributed backend capable of handling spikes in applicant traffic while remaining online even during external third-party API disruptions.
4. **Context-Rich Recruiter Intelligence:** Instant synthesis of candidate strengths, gaps, and project depth through conversational AI.
