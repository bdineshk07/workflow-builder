#!/usr/bin/env python3
"""
Database initialization script for AI Workflow Backend.
Run this script to create all database tables.
"""

import sys
import os
import logging

# Add the app directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import create_tables, engine
from app.models import Base
from sqlalchemy import text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_database():
    """Initialize the database with all tables."""
    try:
        logger.info("Creating database tables...")
        
        # Test database connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            logger.info("Database connection successful")
        
        # Create all tables
        create_tables()
        logger.info("Database tables created successfully!")
        
        # Verify tables were created
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT tablename FROM pg_tables 
                WHERE schemaname = 'public'
                ORDER BY tablename
            """))
            tables = [row[0] for row in result]
            logger.info(f"Created tables: {', '.join(tables)}")
            
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        sys.exit(1)

def reset_database():
    """Reset database by dropping and recreating all tables."""
    try:
        logger.warning("RESETTING DATABASE - This will delete all data!")
        response = input("Are you sure? Type 'yes' to continue: ")
        
        if response.lower() != 'yes':
            logger.info("Database reset cancelled")
            return
            
        logger.info("Dropping all tables...")
        Base.metadata.drop_all(bind=engine)
        
        logger.info("Recreating all tables...")
        Base.metadata.create_all(bind=engine)
        
        logger.info("Database reset completed successfully!")
        
    except Exception as e:
        logger.error(f"Error resetting database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--reset":
        reset_database()
    else:
        init_database()