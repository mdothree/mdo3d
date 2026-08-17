FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application as package
COPY . ./backend/
RUN touch ./backend/__init__.py

EXPOSE 8050

CMD ["uvicorn", "backend.api:app", "--host", "0.0.0.0", "--port", "8050"]
