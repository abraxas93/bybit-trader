# Use the specific version of node based on Alpine Linux
FROM node:21-alpine3.17

# Set environment to production
ENV NODE_ENV production

# Create app directory inside the container
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# If you have a tsconfig.json file, uncomment the next line to copy it
COPY tsconfig.json ./

COPY .env ./

# Install dependencies
RUN npm install

# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source inside the Docker image
COPY . .

# Build TypeScript to JavaScript if needed
RUN npm run build

# Your app binds to port 3000 so you'll use the EXPOSE instruction to have it mapped by the docker daemon
EXPOSE 3001

# Define the command to run your app using CMD which defines your runtime
CMD [ "npm", "start" ]
