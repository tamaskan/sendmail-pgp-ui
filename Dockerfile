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
EXPOSE 25

VOLUME /keys

ENV SENDMAIL_SMART_HOST
ENV SENDMAIL_SMART_PORT
ENV SENDMAIL_SMART_LOGIN
ENV SENDMAIL_SMART_PASSWORD
ENV site
ENV jwtlocation

CMD ["/bin/bash", "-c", "npm run watch;/tmp/sendmail -smtp"]