# frontend/Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy app code
COPY . .

# Build production build
RUN npm run build

# Expose frontend port
EXPOSE 3000

# Run Next.js
CMD ["npm", "start"]
