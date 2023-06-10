FROM node:current
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
RUN apt-get update && apt-get -y install curl
RUN curl -L >sendmail.tar.gz https://github.com/tamaskan/sendmail-pgp/releases/latest/download/sendmail-pgp_Linux_x86_64.tar.gz \
 && tar -xzvf sendmail.tar.gz -C /tmp \
 && rm sendmail.tar.gz
COPY . .
EXPOSE 3000
VOLUME /keys

CMD [ "npm", "watch" ]