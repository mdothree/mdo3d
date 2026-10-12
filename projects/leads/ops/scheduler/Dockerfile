# Scheduler for the leads ingest: supercronic runs ops/scheduler/crontab.
# Build context: projects/leads (see web/docker-compose.yml).
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    TZ=America/New_York \
    LEADS_DB_PATH=/data/leads.db \
    LEADS_DATA_DIR=/data/raw \
    LEADS_OUTPUT_DIR=/data/output \
    LEADS_LOG_DIR=/data/logs \
    LEADS_BACKUP_DIR=/backups

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates sqlite3 tzdata \
 && rm -rf /var/lib/apt/lists/*

# https://github.com/aptible/supercronic/releases (checksum from the release notes)
ENV SUPERCRONIC_URL=https://github.com/aptible/supercronic/releases/download/v0.2.49/supercronic-linux-amd64 \
    SUPERCRONIC_SHA1SUM=e63c11a9726b775a6a11801e81af4f3fb926aa68 \
    SUPERCRONIC=supercronic-linux-amd64
RUN curl -fsSLO "$SUPERCRONIC_URL" \
 && echo "${SUPERCRONIC_SHA1SUM}  ${SUPERCRONIC}" | sha1sum -c - \
 && chmod +x "$SUPERCRONIC" \
 && mv "$SUPERCRONIC" "/usr/local/bin/${SUPERCRONIC}" \
 && ln -s "/usr/local/bin/${SUPERCRONIC}" /usr/local/bin/supercronic

COPY ops/scheduler/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

WORKDIR /app
COPY src/ ./src/
COPY config/ ./config/
COPY web/backend/db.py ./web/backend/db.py
COPY ops/scheduler/ ./ops/scheduler/
RUN chmod +x ops/scheduler/*.sh && mkdir -p /data /backups

HEALTHCHECK --interval=5m --timeout=20s --start-period=1m --retries=3 CMD ["/app/ops/scheduler/healthcheck.sh"]

CMD ["supercronic", "-passthrough-logs", "/app/ops/scheduler/crontab"]
