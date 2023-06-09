FROM node:current
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
RUN apt-get install -y curl
COPY . .
EXPOSE 3000
VOLUME /keys

RUN curl -SL https://github.com/tamaskan/sendmail-pgp/releases/latest/download/sendmail-pgp_Linux_x86_64.tar.gz | tar -xvzf /tmp

CMD [ "npm", "watch" ]