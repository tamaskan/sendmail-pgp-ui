FROM node:current
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
VOLUME /keys
CMD [ "npm", "watch" ]