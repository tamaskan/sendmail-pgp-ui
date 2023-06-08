FROM node:current
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
VOLUME /keys

VOLUME /tmp/sendmail 
#or extract sendmail from github

CMD [ "npm", "watch" ]