import os
import sys
from fpdf import FPDF

class GuidePDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("helvetica", "B", 8)
            self.set_text_color(100, 100, 100)
            self.cell(0, 10, "Talent Intelligence Platform - Backend Architecture Guide", new_x="RIGHT", new_y="TOP")
            self.set_x(-40)
            self.cell(0, 10, "System Design & Interview Bible", new_x="LMARGIN", new_y="NEXT", align="R")
            self.set_draw_color(180, 180, 180)
            self.line(15, 18, 195, 18)
            self.ln(5)

    def footer(self):
        if self.page_no() > 1:
            self.set_y(-15)
            self.set_font("helvetica", "I", 8)
            self.set_text_color(120, 120, 120)
            self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

def sanitize(text):
    if not text:
        return ""
    replacements = {
        "\u2014": " - ",
        "\u2013": " - ",
        "\u201c": '"',
        "\u201d": '"',
        "\u2018": "'",
        "\u2019": "'",
        "\u2022": "* ",
        "\u2192": "->",
        "\u2713": "[ok]",
        "\u00e9": "e",
        "\u00e1": "a",
        "\u00f3": "o",
        "\u00fa": "u",
        "\u00ed": "i",
        "\u00f1": "n",
        "\u00d7": "x",
        "\u2194": "<->",
        "\u2265": ">=",
        "\u2264": "<=",
        "\u22c5": "*",
        "\u2026": "...",
    }
    for uni, asc in replacements.items():
        text = text.replace(uni, asc)
    return text.encode("latin-1", errors="ignore").decode("latin-1")

def build_pdf(output_path):
    print("Generating Backend Architecture Guide PDF...")
    pdf = GuidePDF(orientation="P", unit="mm", format="A4")
    pdf.alias_nb_pages()
    
    # ------------------ COVER PAGE ------------------
    pdf.add_page()
    pdf.set_margins(15, 20, 15)
    pdf.ln(30)
    
    pdf.set_font("helvetica", "B", 24)
    pdf.set_text_color(26, 54, 93) # Navy Blue
    pdf.multi_cell(0, 12, "TALENT INTELLIGENCE PLATFORM", align="C")
    
    pdf.ln(5)
    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(74, 85, 104) # Charcoal
    pdf.multi_cell(0, 10, "Distributed Microservices Architecture\n& System Design Interview Study Guide", align="C")
    
    pdf.ln(15)
    pdf.set_draw_color(74, 85, 104)
    pdf.line(40, pdf.get_y(), 170, pdf.get_y())
    
    pdf.ln(15)
    pdf.set_font("helvetica", "", 12)
    pdf.set_text_color(45, 55, 72)
    intro_text = (
        "A deep architectural dissection of your production-grade backend platform.\n\n"
        "This guide maps core system design topologies, inter-service API Gateway routing, "
        "security context propagation, Redis caching strategies, Kafka idempotent consumer boundaries, "
        "and RAG-enabled chat pipelines directly to your Spring Boot 3.4.0 and Java 21 implementation.\n\n"
        "Prepared for senior engineering interviews, system audits, and architectural analysis."
    )
    pdf.multi_cell(0, 7, sanitize(intro_text), align="C")
    
    pdf.ln(35)
    pdf.set_font("helvetica", "B", 10)
    pdf.set_text_color(113, 128, 150)
    pdf.cell(0, 5, "CONFIDENTIAL SYSTEM ARCHITECTURE HANDBOOK", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.cell(0, 5, "DESIGNED FOR HIRING PREPARATION & ARCHITECTURAL AUDIT", new_x="LMARGIN", new_y="NEXT", align="C")
    
    # ------------------ SECTIONS DATA ------------------
    sections = [
        {
            "title": "SECTION 1 - SYSTEM TOPOLOGY & MICROSERVICES GRID",
            "content": [
                {
                    "subtitle": "Microservices Grid Overview",
                    "text": (
                        "The platform implements a highly decoupled, database-per-service distributed topology built on "
                        "Java 21, Spring Boot 3.4.0, and Spring Cloud modules. Service discovery is managed by Eureka Server "
                        "on port 8761, exposing endpoints through a Netty-based Spring Cloud Gateway running on port 8090.\n\n"
                        "Each downstream service encapsulates its domain boundaries entirely. Direct database sharing is prohibited, "
                        "ensuring schema modifications on one service (e.g. adding columns to resume table) do not trigger cascading breaks. "
                        "Communication alternates between synchronous REST (Feign) for low-latency CRUD metadata and asynchronous Kafka "
                        "events for high-throughput heavy calculations."
                    )
                },
                {
                    "subtitle": "Microservice Directory Mapping",
                    "text": (
                        "* eureka-server (8761): Service discovery lookup registry.\n"
                        "* api-gateway (8090): Spring Cloud Gateway for JWT auth verification, routing, and header claims injection.\n"
                        "* user-management-service (8081): Recruiter profiles, DB = user_db.\n"
                        "* authentication-service (8082): Password validation, token signing (Jwts), OTP generation, DB = auth_db.\n"
                        "* resume-management-service (8083): File uploads (AWS S3), CandidateResume state controller, DB = resume_db.\n"
                        "* ai-screening-service (8084): Apache Tika parsing, sentence chunking, Vector embeddings (PgVector), DB = screening_db.\n"
                        "* candidate-ranking-service (8086): Ollama-based scoring, Redis Sorted Set rankings, DB = ranking_db.\n"
                        "* recruiter-chat-service (8087): RAG pipelines (expansion, hybrid search, cosine rerank), DB = chat_db.\n"
                        "* notification-service (8088): Kafka email consumers (no database)."
                    )
                }
            ]
        },
        {
            "title": "SECTION 2 - CORE ARCHITECTURAL PATTERNS",
            "content": [
                {
                    "subtitle": "A. API Gateway Authorization Context Propagation",
                    "text": (
                        "Rather than validating JWT tokens inside every single service, the Netty-based api-gateway intercepts requests, "
                        "validates the signature using HMAC-SHA key parsing, extracts user profile parameters, and translates them into "
                        "standard downstream headers:\n"
                        "  - X-User-Email\n"
                        "  - X-User-Role\n"
                        "  - X-User-Id\n\n"
                        "Downstream services load GatewayHeaderAuthFilter in their Spring Security configuration. If X-User-Email is detected, "
                        "they populate SecurityContextHolder with UsernamePasswordAuthenticationToken, trusting the gateway context natively. "
                        "This keeps services completely stateless and avoids redundant token parsing overhead."
                    )
                },
                {
                    "subtitle": "B. High-Speed Cache via Redis Sorted Sets (ZSets)",
                    "text": (
                        "To display candidate rankings instantly on the recruiter dashboard, candidate-ranking-service bypasses PostgreSQL query-time "
                        "sorting. Instead, when a candidate score is calculated, the score is added to a Redis ZSet:\n"
                        "  `redisTemplate.opsForZSet().add(\"jd:ranking:\" + jobId, resumeId, matchScore);` \n\n"
                        "This indexes scores under the job ID. Paginating candidates requires ZREVRANGE commands, providing O(log(N) + M) lookup complexity. "
                        "This ensures sub-millisecond page loads under high user concurrency."
                    )
                },
                {
                    "subtitle": "C. Kafka Failover Resiliency & Consumer Idempotency",
                    "text": (
                        "Network fluctuations can crash inter-service Feign calls or duplicate Kafka messages. The platform mitigates this through:\n"
                        "1. REST-to-Event Failover: In AIScreeningService, updating the resume status is attempted via Feign. If Feign fails, "
                        "it catches the exception and publishes a resume-status-updated event to Kafka. The Resume service consumes this asynchronously, "
                        "ensuring eventual consistency of database states.\n"
                        "2. Idempotent Consumer Design: Consumers execute read-before-write checks (e.g. existsByEmail) backed by unique database indices. "
                        "Message routing keys (like resumeId or email) guarantee that related records are processed sequentially by the same partition thread, "
                        "preventing concurrency races."
                    )
                }
            ]
        },
        {
            "title": "SECTION 3 - PIPELINES & FLOW MECHANICS",
            "content": [
                {
                    "subtitle": "A. End-to-End Ingestion Pipeline",
                    "text": (
                        "1. Client POSTs resume to /api/v1/resumes/upload via Gateway.\n"
                        "2. Gateway validates JWT, propagates claims, and forwards binary to resume-management-service.\n"
                        "3. Resume service uploads raw file to S3, writes CandidateResume entity as 'UPLOADED', and publishes a resume-uploaded event to Kafka.\n"
                        "4. AI Screening service consumes event, downloads S3 stream, parses text via Apache Tika, and chunks it via sentence boundaries.\n"
                        "5. AI Screening calls Ollama Llama3 to extract metadata JSON, stores text chunks + PgVector embeddings, updates Resume Service to 'PARSED', and publishes a resume-parsed event.\n"
                        "6. Candidate Ranking service consumes 'resume-parsed', calls Ollama screening endpoint, writes ScreeningReport, indexes score in Redis ZSet, and publishes 'SCREENED' status back to Kafka."
                    )
                },
                {
                    "subtitle": "B. RAG & Chat Retrieval Pipeline",
                    "text": (
                        "1. Client query and resumeId reach recruiter-chat-service.\n"
                        "2. QueryRouterService evaluates keyword lists to choose route: CONVERSATIONAL, TOOL_CALL, or VECTOR_SEARCH.\n"
                        "3. If VECTOR_SEARCH, LLM rewrites the query for search optimization, then expands it into 3 query variations.\n"
                        "4. HybridRetrievalService executes PgVector searches. If vector matches are < 2, it executes Feign fallback to search local keywords inside the screening DB chunks.\n"
                        "5. DocumentJoinerService merges results and runs Reciprocal Rank Fusion (RRF) to rank chunks based on query overlaps.\n"
                        "6. RerankingService computes exact cosine similarity coordinates between query and top chunks, selecting the top 5.\n"
                        "7. The selected context, combined with RedisChatMemory history, is injected into the prompt and sent to Ollama for the final response."
                    )
                }
            ]
        },
        {
            "title": "SECTION 4 - ARCHITECTURAL DECISIONS & TRADE-OFFS",
            "content": [
                {
                    "subtitle": "Monolith vs. Microservices",
                    "text": (
                        "* Approach: Decoupled services (Gateway + Eureka + 8 downstream services).\n"
                        "* Trade-off: Monolith is far simpler to deploy and maintains strong transactional consistency (ACID). However, "
                        "processing resumes (Tika parsing) and LLM screening are highly CPU and RAM bound. In a monolith, spikes in resume "
                        "uploads would exhaust thread pools and lock recruiter login pages. Microservices allow scaling ai-screening-service "
                        "independently while auth and job lookup remain highly available."
                    )
                },
                {
                    "subtitle": "PgVector vs. Dedicated Vector Database (Pinecone / Milvus)",
                    "text": (
                        "* Approach: Storing chunk embeddings in PostgreSQL using the pgvector extension.\n"
                        "* Trade-off: Dedicated vector stores process indices slightly faster at extreme scale (billions of vectors). However, "
                        "they introduce data synchronization lag, lack transactions, and require managing a separate system. PgVector allows "
                        "storing candidate text chunks, relational indices, and 768-dimensional coordinates in the same database table, "
                        "enabling ACID transactions and fast relational joins in a single SQL statement."
                    )
                },
                {
                    "subtitle": "Kafka vs. RabbitMQ",
                    "text": (
                        "* Approach: Event streaming via Apache Kafka.\n"
                        "* Trade-off: RabbitMQ is easier to configure and has lower latency. However, RabbitMQ deletes messages upon consumer "
                        "acknowledgment. Kafka operates as a partitioned commit log, storing events permanently. If the screening logic or "
                        "embedding model changes in the future, we can reset offsets and replay historical resume upload streams to re-index the "
                        "entire candidate pool without asking recruiters to re-upload files."
                    )
                }
            ]
        },
        {
            "title": "SECTION 5 - OBSERVABILITY & SYSTEM MONITORING",
            "content": [
                {
                    "subtitle": "Pull-Based Metrics Stack",
                    "text": (
                        "The platform integrates a complete, production-grade observability stack built on Prometheus, Grafana, "
                        "and Spring Boot Actuator with Micrometer:\n"
                        "1. Instrumentation: Downstream services run Actuator, exposing metrics at `/actuator/prometheus` ( HikariCP pool usage, JVM GC activity, CPU consumption).\n"
                        "2. Exporters: Separate exporters monitor PostgreSQL databases (postgres-exporter), Redis caching instances (redis-exporter), and Kafka brokers (kafka-exporter).\n"
                        "3. Aggregation & Dashboards: Prometheus scrapes these metrics at 15-second intervals. Grafana provisions visual boards for real-time JVM thread statuses, database connection pool saturation, and Kafka consumer lag.\n"
                        "4. Custom Metrics: Inside RankingService, we track custom Prometheus counters (e.g. `ranking.redis.updates.total`) to audit cache hits/failures."
                    )
                }
            ]
        }
    ]
    
    # ------------------ RENDER SECTIONS ------------------
    for section in sections:
        pdf.add_page()
        pdf.ln(5)
        pdf.set_font("helvetica", "B", 14)
        pdf.set_text_color(44, 122, 123) # Teal
        pdf.cell(0, 8, sanitize(section["title"]), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)
        
        for item in section["content"]:
            # Check for page spill
            if pdf.get_y() + 40 > 270:
                pdf.add_page()
                pdf.ln(5)
            
            pdf.set_font("helvetica", "B", 11)
            pdf.set_text_color(26, 54, 93) # Navy
            pdf.multi_cell(0, 6, sanitize(item["subtitle"]))
            pdf.ln(2)
            
            pdf.set_font("helvetica", "", 10)
            pdf.set_text_color(45, 55, 72) # Charcoal/Grey
            pdf.multi_cell(0, 5, sanitize(item["text"]))
            pdf.ln(6)
            
            # Separator line
            pdf.set_draw_color(220, 220, 220)
            pdf.line(15, pdf.get_y(), 195, pdf.get_y())
            pdf.ln(4)
            
    pdf.output(output_path)
    print(f"Backend Architecture Guide PDF successfully created at {output_path}")

if __name__ == "__main__":
    out_pdf = os.path.join(os.getcwd(), "backend_architecture_guide.pdf")
    build_pdf(out_pdf)
