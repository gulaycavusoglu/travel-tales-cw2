FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

# Create a directory for the database
RUN mkdir -p /app/data && chmod 777 /app/data

COPY . .

EXPOSE 7000

CMD ["npm", "start"]
