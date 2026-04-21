FROM python:3.11-slim

WORKDIR /app

COPY services/requirements-s2.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY . /app

ENV PYTHONUNBUFFERED=1
