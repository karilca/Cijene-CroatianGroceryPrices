#!/bin/bash

# Change to the project directory
cd /DATA/AppData/cijene-api

# Get current date in YYYY-MM-DD format
CURRENT_DATE=$(date +%Y-%m-%d)

# Run the crawler
echo "Starting crawler at $(date)"
docker-compose run --rm crawler

# Check if crawler was successful
if [ $? -eq 0 ]; then
    echo "Crawler completed successfully. Starting import for date: $CURRENT_DATE"
    
    # Run the import with current date
    docker-compose exec -T api uv run -m service.db.import /app/data/$CURRENT_DATE
    
    if [ $? -eq 0 ]; then
        echo "Import completed successfully at $(date)"
    else
        echo "Import failed at $(date)" >&2
        exit 1
    fi
else
    echo "Crawler failed at $(date)" >&2
    exit 1
fi