FROM mhart/alpine-node:10.15.3

RUN mkdir -p /usr/local/loopring3
WORKDIR /usr/local/loopring3

ADD . /usr/local/loopring3

EXPOSE 8545

CMD ./node_modules/.bin/buidler node
