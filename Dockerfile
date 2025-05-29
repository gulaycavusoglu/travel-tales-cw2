FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Create a directory for the database
RUN mkdir -p /app/data && chmod 777 /app/data

# Set environment variables
ENV PORT=5000

# Expose the port
EXPOSE 5000

# Run the app
CMD ["npm", "start"] 