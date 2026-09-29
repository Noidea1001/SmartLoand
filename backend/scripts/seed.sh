#!/bin/sh
# Convenience wrapper: seeds demo data into a running backend container.
# Usage (from the project root, with docker compose already up):
#   docker compose exec backend sh scripts/seed.sh
set -e
python -m app.db.seed_data
