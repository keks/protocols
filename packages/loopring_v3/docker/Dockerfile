FROM ubuntu:18.04

RUN sudo apt-get update && sudo apt-get upgrade

RUN mkdir -p /usr/local/loopring3
WORKDIR /usr/local/loopring3

ADD . /usr/local/loopring3

EXPOSE 8545

CMD ./node_modules/.bin/buidler node
