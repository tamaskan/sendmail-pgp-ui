FROM node:current
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
RUN apt-get update && apt-get install -y curl && curl -SL https://github.com/tamaskan/sendmail-pgp/releases/latest/download/sendmail-pgp_Linux_x86_64.tar.gz | tar -xvzf /tmp
COPY . .
EXPOSE 3000
VOLUME /keys

CMD [ "npm", "watch" ]