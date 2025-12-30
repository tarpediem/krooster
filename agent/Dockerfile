FROM python:3.12-slim

WORKDIR /app

# Install Claude Code (required by Agent SDK)
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://claude.ai/install.sh | bash && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the agent code
COPY schedule_generator.py .

# Expose the API port
EXPOSE 5679

# Run the agent server
CMD ["python", "schedule_generator.py", "--server", "--port", "5679"]
