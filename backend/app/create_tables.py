from .database import engine, Base
from .models import Document, Workflow, ChatLog

print("Creating tables...")
Base.metadata.create_all(bind=engine)
print("Tables created successfully!")
